import { useDb } from "@/db/client.js";
import { v4 as uuidv4 } from "uuid";
import { hashPin, verifyPin } from "@/utils/pin.js";
import { eq } from "drizzle-orm";

import {
  companies,
  customers,
  customer_addresses,
  categories,
  products,
  items,
  carts,
  cart_items,
  invoices,
  invoice_items,
  payments,
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
    if (!rows.length) throw new Error("POS not initialized");

    const company = rows[0];
    if (company.device_id !== device_id) throw new Error("Unauthorized device");
    if (!(await verifyPin(pin, company.pin_hash))) throw new Error("Invalid PIN");

    return company;
  };

  /* ================= CUSTOMERS ================= */
  const createCustomer = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();
    const id = uuidv4();

    await drizzleDb.insert(customers).values({
      id,
      ...data,
      created_at: now(),
      updated_at: now(),
    });

    await enqueueSync({
      entity: "customers",
      entity_id: id,
      action: "CREATE",
      payload: data,
    });

    await persistDb();
    return id;
  };

  const addCustomerAddress = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();
    await drizzleDb.insert(customer_addresses).values({
      id: uuidv4(),
      ...data,
      created_at: now(),
      updated_at: now(),
    });
    await persistDb();
  };

  /* ================= CATEGORIES ================= */
  const createCategory = async (data, parent_id = null) => {
    const { drizzleDb, persistDb } = await dbReady();
    await drizzleDb.insert(categories).values({
      id: uuidv4(),
      name: data.name,
      description: safeBind(data.description),
      company_id: data.company_id,
      parent_id,
      created_at: now(),
      updated_at: now(),
    });
    await persistDb();
  };

const getCategories = async (parent_id = null) => {
  const { drizzleDb } = await dbReady();

  return drizzleDb
    .select()
    .from(categories)
    .where(
      parent_id === null
        ? eq(categories.parent_id, null)
        : eq(categories.parent_id, parent_id)
    );
};

  /* ================= PRODUCTS ================= */
  const createProduct = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();
    const id = uuidv4();

    await drizzleDb.insert(products).values({
      id,
      ...data,
      created_at: now(),
      updated_at: now(),
    });

    await enqueueSync({
      entity: "products",
      entity_id: id,
      action: "CREATE",
      payload: data,
    });

    await persistDb();
    return id;
  };

  /* ================= CART ================= */
  const createCart = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();
    const id = uuidv4();

    await drizzleDb.insert(carts).values({
      id,
      status: "ACTIVE",
      total_amount: 0,
      ...data,
      created_at: now(),
      updated_at: now(),
    });

    await persistDb();
    return id;
  };

  const addCartItem = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();
    const id = uuidv4();

    await drizzleDb.insert(cart_items).values({
      id,
      ...data,
      total: data.quantity * data.price,
      created_at: now(),
      updated_at: now(),
    });

    await recalcCartTotal(data.cart_id);
    await persistDb();
    return id;
  };

  const updateCartItem = async (cart_item_id, updates) => {
    const { drizzleDb, persistDb } = await dbReady();

    const [item] = await drizzleDb
      .select()
      .from(cart_items)
      .where(cart_items.id.eq(cart_item_id))
      .limit(1);

    if (!item) throw new Error("Item not found");

    const quantity = updates.quantity ?? item.quantity;
    const price = updates.price ?? item.price;

    await drizzleDb
      .update(cart_items)
      .set({
        ...updates,
        quantity,
        price,
        total: quantity * price,
        updated_at: now(),
      })
      .where(cart_items.id.eq(cart_item_id));

    await recalcCartTotal(item.cart_id);
    await persistDb();
  };

  const removeCartItem = async (cart_item_id) => {
    const { drizzleDb, persistDb } = await dbReady();

    const [item] = await drizzleDb
      .select()
      .from(cart_items)
      .where(cart_items.id.eq(cart_item_id))
      .limit(1);

    await drizzleDb.delete(cart_items).where(cart_items.id.eq(cart_item_id));
    await recalcCartTotal(item.cart_id);
    await persistDb();
  };

  const recalcCartTotal = async (cart_id) => {
    const { drizzleDb } = await dbReady();

    const rows = await drizzleDb
      .select()
      .from(cart_items)
      .where(cart_items.cart_id.eq(cart_id));

    const total = rows.reduce((s, r) => s + r.total, 0);

    await drizzleDb
      .update(carts)
      .set({ total_amount: total, updated_at: now() })
      .where(carts.id.eq(cart_id));

    return total;
  };

  const getActiveCart = async () => {
    const { drizzleDb } = await dbReady();

    const [cart] = await drizzleDb
      .select()
      .from(carts)
      .where(carts.status.eq("ACTIVE"))
      .limit(1);

    if (!cart) return null;

    const items = await drizzleDb
      .select()
      .from(cart_items)
      .where(cart_items.cart_id.eq(cart.id));

    return { ...cart, items };
  };

  const closeCart = async (cart_id) => {
    const { drizzleDb, persistDb } = await dbReady();

    await drizzleDb
      .update(carts)
      .set({ status: "COMPLETED", updated_at: now() })
      .where(carts.id.eq(cart_id));

    await persistDb();
  };

  /* ================= INVOICE ================= */
  const createInvoice = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();
    const id = uuidv4();

    await drizzleDb.insert(invoices).values({
      id,
      invoice_number: `INV-${Date.now()}`,
      status: "PENDING",
      date: now(),
      ...data,
      created_at: now(),
      updated_at: now(),
    });

    await enqueueSync({
      entity: "invoices",
      entity_id: id,
      action: "CREATE",
      payload: data,
    });

    await persistDb();
    return id;
  };

  const addInvoiceItem = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();

    await drizzleDb.insert(invoice_items).values({
      id: uuidv4(),
      ...data,
      total: data.quantity * data.price,
      paid_amount: 0,
      status: "ORDERED",
      created_at: now(),
      updated_at: now(),
    });

    await persistDb();
  };

  const createPayment = async (data) => {
    const { drizzleDb, persistDb } = await dbReady();
    const id = uuidv4();

    await drizzleDb.insert(payments).values({
      id,
      ...data,
      date: now(),
      created_at: now(),
      updated_at: now(),
    });

    await enqueueSync({
      entity: "payments",
      entity_id: id,
      action: "CREATE",
      payload: data,
    });

    await persistDb();
    return id;
  };

  /* ================= EXPORT ================= */
  return {
    createCompany,
    validateCompanyPin,

    createCustomer,
    addCustomerAddress,

    createCategory,
    getCategories,
    createProduct,

    createCart,
    addCartItem,
    updateCartItem,
    removeCartItem,
    getActiveCart,
    closeCart,

    createInvoice,
    addInvoiceItem,
    createPayment,
  };
}
