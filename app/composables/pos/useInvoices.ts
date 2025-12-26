import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { invoices, invoice_items, carts, cart_items } from "@/db/schema";
import { dbReady } from "@/db/client";
import { enqueueSync } from "@/sync/queue";

const now = () => new Date().toISOString();

export function useInvoice() {

  /* ================= INVOICE ================= */

  const createInvoice = async (data: {
    company_id: string;
    customer_id?: string;
    cart_id?: string;
    total_amount: number;
    tax_amount?: number;
    discount_amount?: number;
    due_date?: string;
  }) => {
    const { drizzleDb, persistDb } = await dbReady();
    const id = uuidv4();

    const invoice_number = `INV-${Date.now()}`;

    await drizzleDb.insert(invoices).values({
      id,
      invoice_number,
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
      payload: { ...data, invoice_number },
    });

    await persistDb();
    return id;
  };

  const addInvoiceItem = async (data: {
    invoice_id: string;
    product_id?: string;
    description?: string;
    quantity: number;
    price: number;
  }) => {
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

  /* ================= CART → INVOICE ================= */

  const generateInvoiceFromCart = async (cart_id: string) => {
    const { drizzleDb, persistDb } = await dbReady();

    const [cart] = await drizzleDb
      .select()
      .from(carts)
      .where(eq(carts.id, cart_id))
      .limit(1);

    if (!cart) throw new Error("Cart not found");

    const items = await drizzleDb
      .select()
      .from(cart_items)
      .where(eq(cart_items.cart_id, cart_id));

    const invoice_id = uuidv4();
    const invoice_number = `INV-${Date.now()}`;

    await drizzleDb.insert(invoices).values({
      id: invoice_id,
      invoice_number,
      company_id: cart.company_id,
      customer_id: cart.customer_id,
      cart_id,
      total_amount: cart.total_amount,
      status: "PENDING",
      date: now(),
      created_at: now(),
      updated_at: now(),
    });

    for (const item of items) {
      await drizzleDb.insert(invoice_items).values({
        id: uuidv4(),
        invoice_id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        paid_amount: 0,
        status: "ORDERED",
        created_at: now(),
        updated_at: now(),
      });
    }

    await drizzleDb
      .update(carts)
      .set({ status: "COMPLETED", updated_at: now() })
      .where(eq(carts.id, cart_id));

    await enqueueSync({
      entity: "invoices",
      entity_id: invoice_id,
      action: "CREATE",
      payload: { cart_id },
    });

    await persistDb();
    return invoice_id;
  };

  /* ================= INVOICE STATUS ================= */

  const markInvoicePaid = async (invoice_id: string) => {
    const { drizzleDb, persistDb } = await dbReady();

    await drizzleDb
      .update(invoices)
      .set({ status: "PAID", updated_at: now() })
      .where(eq(invoices.id, invoice_id));

    await enqueueSync({
      entity: "invoices",
      entity_id: invoice_id,
      action: "UPDATE",
      payload: { status: "PAID" },
    });

    await persistDb();
  };

  const cancelInvoice = async (invoice_id: string) => {
    const { drizzleDb, persistDb } = await dbReady();

    await drizzleDb
      .update(invoices)
      .set({ status: "CANCELLED", updated_at: now() })
      .where(eq(invoices.id, invoice_id));

    await persistDb();
  };

  /* ================= FETCH ================= */

  const getInvoiceById = async (invoice_id: string) => {
    const { drizzleDb } = await dbReady();

    const [invoice] = await drizzleDb
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoice_id))
      .limit(1);

    if (!invoice) return null;

    const items = await drizzleDb
      .select()
      .from(invoice_items)
      .where(eq(invoice_items.invoice_id, invoice_id));

    return { ...invoice, items };
  };

  const getCompanyInvoices = async (company_id: string) => {
    const { drizzleDb } = await dbReady();

    return drizzleDb
      .select()
      .from(invoices)
      .where(eq(invoices.company_id, company_id));
  };

  return {
    createInvoice,
    addInvoiceItem,
    generateInvoiceFromCart,
    markInvoicePaid,
    cancelInvoice,
    getInvoiceById,
    getCompanyInvoices,
  };
}
