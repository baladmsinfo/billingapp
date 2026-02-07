import { useDb } from "@/db/client.js";
import { v4 as uuidv4 } from "uuid";
import { hashPin, verifyPin } from "@/utils/pin.js";
import { eq } from "drizzle-orm";

import {
  companies,
  sync_queue,
} from "@/db/schema.js";

/* ---------------- HELPERS ---------------- */
const now = () => Date.now();
const safeBind = (v) => (v === undefined || v === null ? null : v);

/* ================= MAIN ================= */
export function useDbModels() {
  const dbReady = async () => {
    const { drizzleDb, persistDb } = await useDb();
    return { drizzleDb, persistDb };
  };

  /* ---------------- SYNC QUEUE ---------------- */
  const enqueueSync = async ({ entity, entity_id, action, payload }) => {
    const { drizzleDb } = await dbReady();

    await drizzleDb.insert(sync_queue).values({
      id: uuidv4(),
      entity,
      entity_id,
      action,
      payload: JSON.stringify(payload),
      status: "PENDING",
      retry_count: 0,
      created_at: now(),
      updated_at: now(),
    });
  };

  /* ================= COMPANY ================= */
  const createCompany = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();
    const exists = await drizzleDb.select().from(companies).limit(1);
    if (exists.length) throw new Error("Company already exists");

    const id = uuidv4();

    await drizzleDb.insert(companies).values({
      id,
      ...data,
      pin_hash: await hashPin(data.pin),
      created_at: now(),
      updated_at: now(),
    });

    await enqueueSync({
      entity: "companies",
      entity_id: id,
      action: "CREATE",
      payload: data,
    });

    await persistDb();
    return id;
  };

  const validateCompanyPin = async ({ pin, device_id }) => {
    const { drizzleDb } = await dbReady();
    const rows = await drizzleDb.select().from(companies).limit(1);
    console.log(rows);
    
    if (!rows.length) throw new Error("POS not initialized");

    const company = rows[0];
    if (company.device_id !== device_id) throw new Error("Unauthorized device");
    if (!(await verifyPin(pin, company.pin_hash))) throw new Error("Invalid PIN");

    return company;
  };

  /* ================= EXPORT ================= */
  return {
    createCompany,
    validateCompanyPin,
  };
}
