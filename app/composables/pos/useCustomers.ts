import { customers, customer_addresses } from "@/db/schema";
import { dbReady } from "@/db/dbReady";
import { enqueueSync } from "./useSyncQueue";
import { uuidv4 } from "@/utils/uuid";

const now = () => Math.floor(Date.now() / 1000);

export function useCustomers() {
  /* ================= CREATE CUSTOMER ================= */
  const createCustomer = async (data: {
    name: string;
    phone?: string;
    email?: string;
    gstin?: string;
    company_id: string;
  }) => {
    const { drizzleDb, persistDb } = await dbReady();

    const id = uuidv4();

    const row = {
      id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      gstin: data.gstin,
      company_id: data.company_id,
      created_at: now(),
      updated_at: now(),
    };

    await drizzleDb.insert(customers).values(row);

    await enqueueSync({
      entity: "customers",
      entity_id: id,
      action: "CREATE",
      payload: row, // sync exact row
    });

    await persistDb();
    return id;
  };

  /* ================= ADD CUSTOMER ADDRESS ================= */
  const addCustomerAddress = async (data: {
    customer_id: string;
    address_line1?: string;
    address_line2?: string;
    address_line3?: string;
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
        .update(customer_addresses)
        .set({ is_default: 0 })
        .where({ customer_id: data.customer_id });
    }

    const row = {
      id,
      customer_id: data.customer_id,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      address_line3: data.address_line3,
      city: data.city,
      state: data.state,
      country: data.country,
      pincode: data.pincode,
      is_default: data.is_default ? 1 : 0,
      created_at: now(),
      updated_at: now(),
    };

    await drizzleDb.insert(customer_addresses).values(row);

    await enqueueSync({
      entity: "customer_addresses",
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


// const { createCustomer, addCustomerAddress } = useCustomers();

// const customerId = await createCustomer({
//   name: "Ravi Kumar",
//   phone: "9XXXXXXXXX",
//   company_id: COMPANY_ID,
// });

// await addCustomerAddress({
//   customer_id: customerId,
//   city: "Bengaluru",
//   state: "KA",
//   pincode: "560001",
//   is_default: true,
// });