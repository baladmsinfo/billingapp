import { useDb } from "@/db/client";
import { companies } from "@/db/schema";
import { enqueueSync } from "./useSyncQueue";
import { hashPin, verifyPin } from "@/utils/pin";

const COMPANY_ID = "LOCAL_COMPANY";

const now = () => Math.floor(Date.now() / 1000);

export async function useCompany() {
  const { drizzleDb, persistDb } = await useDb();

  /* ================= CREATE / INIT COMPANY ================= */
  const createCompany = async (data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    pin: string;
    device_id: string;
    license_key: string;
    license_token: string;
    license_expiry?: number;
    grace_until?: number;
  }) => {
    const exists = await drizzleDb.select().from(companies).limit(1);
    if (exists.length) {
      throw new Error("Company already initialized");
    }

    await drizzleDb.insert(companies).values({
      id: COMPANY_ID,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      pin_hash: await hashPin(data.pin),
      device_id: data.device_id,
      license_key: data.license_key,
      license_token: data.license_token,
      license_expiry: data.license_expiry,
      grace_until: data.grace_until,
      pin_attempts: 0,
      created_at: now(),
      updated_at: now(),
    });

    // ⚠️ Never sync PIN / secrets
    await enqueueSync({
      entity: "companies",
      entity_id: COMPANY_ID,
      action: "CREATE",
      payload: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        device_id: data.device_id,
      },
    });

    await persistDb();
    return COMPANY_ID;
  };

  /* ================= VALIDATE PIN (LOGIN) ================= */
  const validateCompanyPin = async ({
    pin,
    device_id,
  }: {
    pin: string;
    device_id: string;
  }) => {
    const rows = await drizzleDb.select().from(companies).limit(1);
    if (!rows.length) throw new Error("POS not initialized");

    const company = rows[0];

    // 🔒 Device binding
    if (company.device_id !== device_id) {
      throw new Error("Unauthorized device");
    }

    // 🔒 PIN lock check
    if (
      company.pin_locked_until &&
      company.pin_locked_until > now()
    ) {
      throw new Error("PIN temporarily locked");
    }

    const ok = await verifyPin(pin, company.pin_hash);

    if (!ok) {
      const attempts = (company.pin_attempts ?? 0) + 1;

      await drizzleDb
        .update(companies)
        .set({
          pin_attempts: attempts,
          pin_locked_until:
            attempts >= 5 ? now() + 300 : null, // 5 min lock
          updated_at: now(),
        })
        .where({ id: COMPANY_ID });

      await persistDb();
      throw new Error("Invalid PIN");
    }

    // ✅ Success → reset attempts
    await drizzleDb
      .update(companies)
      .set({
        pin_attempts: 0,
        pin_locked_until: null,
        updated_at: now(),
      })
      .where({ id: COMPANY_ID });

    await persistDb();
    return company;
  };

  /* ================= GET COMPANY ================= */
  const getCompany = async () => {
    const rows = await drizzleDb.select().from(companies).limit(1);
    return rows[0] ?? null;
  };

  return {
    COMPANY_ID,
    createCompany,
    validateCompanyPin,
    getCompany,
  };
}

// const { createCompany, validateCompanyPin } = await useCompany();

// await createCompany({
//   name: "BucksBox Store",
//   phone: "9XXXXXXXXX",
//   pin: "1234",
//   device_id: DEVICE_ID,
//   license_key: "LIC-XXXX",
//   license_token: "JWT-TOKEN",
// });
