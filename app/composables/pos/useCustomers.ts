import { parties, party_addresses } from "@/db/schema";
import { dbReady } from "@/db/dbReady";
import { enqueueSync } from "./useSyncQueue";
import { uuidv4 } from "@/utils/uuid";
import { eq } from "drizzle-orm";

const now = () => Math.floor(Date.now() / 1000);

export function useCustomers() {

  /* ================= CREATE / GET CUSTOMER ================= */
  const createCustomer = async (data: {
    name?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    company_id: string;
  }) => {
    const { drizzleDb, persistDb } = await dbReady();

    // 🔍 1. Prevent duplicate by phone
    if (data.phone) {
      const existing = await drizzleDb
        .select()
        .from(parties)
        .where(eq(parties.phone, data.phone))
        .limit(1);

      if (existing.length > 0) {
        return existing[0].id; // ✅ return existing customer
      }
    }

    // 🆕 2. Create new customer
    const id = uuidv4();

    const row = {
      id,
      company_id: data.company_id,
      type: "CUSTOMER",
      name: data.name || "Walk-in Customer",
      phone: data.phone ?? null,
      email: data.email ?? null,
      gstin: data.gstin ?? null,
      created_at: now(),
      updated_at: now(),
    };

    await drizzleDb.insert(parties).values(row);

    await enqueueSync({
      entity: "parties",
      entity_id: id,
      action: "CREATE",
      payload: row,
    });

    await persistDb();
    return id;
  };

  /* ================= ADD CUSTOMER ADDRESS ================= */
  const addCustomerAddress = async (data: {
    party_id: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    is_default?: boolean;
  }) => {
    const { drizzleDb, persistDb } = await dbReady();

    const id = uuidv4();

    // 🔒 Only one default address per customer
    if (data.is_default) {
      await drizzleDb
        .update(party_addresses)
        .set({ is_default: 0 })
        .where(eq(party_addresses.party_id, data.party_id));
    }

    const row = {
      id,
      party_id: data.party_id,
      address_line1: data.address_line1 ?? null,
      address_line2: data.address_line2 ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      country: data.country ?? null,
      pincode: data.pincode ?? null,
      address_type: "BILLING",
      is_default: data.is_default ? 1 : 0,
      created_at: now(),
      updated_at: now(),
    };

    await drizzleDb.insert(party_addresses).values(row);

    await enqueueSync({
      entity: "party_addresses",
      entity_id: id,
      action: "CREATE",
      payload: row,
    });

    await persistDb();
    return id;
  };

  return {
    createCustomer,
    addCustomerAddress,
  };
}
