import { eq, desc, asc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { invoices, invoice_items, carts, cart_items, products  } from "@/db/schema";
import { useDb } from "@/db/client.js";
import { enqueueSync } from "@/composables/pos/useSyncQueue";

const now = () => Date.now();

export function useInvoice() {
  /* ================= DB ================= */
  const dbReady = async () => {
    const { drizzleDb, persistDb } = await useDb();
    return { drizzleDb, persistDb };
  };

  /* ================= INVOICE ================= */
  const createInvoice = async (data: {
    company_id: string;
    customer_id?: string;
    cart_id?: string;
    total_amount: number;
    tax_amount?: number;
    discount_amount?: number;
    due_date?: number;
  }) => {
    const { drizzleDb, persistDb } = await dbReady();
    const id = uuidv4();
    const invoice_number = `INV-${Date.now()}`;

    await drizzleDb.insert(invoices).values({
      id,
      invoice_number,
      status: "PENDING",
      date: now(),
      created_at: now(),
      updated_at: now(),
      ...data,
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
    product_id: string;
    item_id: string;
    quantity: number;
    price: number;
  }) => {
    const { drizzleDb, persistDb } = await dbReady();

    await drizzleDb.insert(invoice_items).values({
      id: uuidv4(),
      invoice_id: data.invoice_id,
      product_id: data.product_id,
      item_id: data.item_id,
      quantity: data.quantity,
      price: data.price,
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
        item_id: item.item_id,
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
      .set({ status: "CHECKEDOUT", updated_at: now() })
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

  /* ================= STATUS ================= */
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

    // 1️⃣ Fetch invoice
    const [invoice] = await drizzleDb
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoice_id))
      .limit(1);

    if (!invoice) return null;

    // 2️⃣ Fetch invoice items WITH product info
    const items = await drizzleDb
      .select({
        id: invoice_items.id,
        quantity: invoice_items.quantity,
        price: invoice_items.price,
        total: invoice_items.total,
        status: invoice_items.status,

        product_id: products.id,
        product_name: products.name,
        product_sku: products.sku,
        product_price: products.price,
      })
      .from(invoice_items)
      .leftJoin(products, eq(invoice_items.product_id, products.id))
      .where(eq(invoice_items.invoice_id, invoice_id));

    // 3️⃣ Return clean object
    return {
      ...invoice,
      items: items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        price: i.price,
        total: i.total,
        status: i.status,
        product: {
          id: i.product_id,
          name: i.product_name,
          sku: i.product_sku,
          price: i.product_price,
        },
      })),
    };
  };
  /**
   * Server-side paginated & sortable invoices
   */
  const getCompanyInvoicesServer = async (params: {
    company_id: string;
    page: number;
    limit: number;
    sortBy?: "date" | "total_amount" | "status" | "invoice_number" | "type";
    sortOrder?: "asc" | "desc";
  }) => {
    const { drizzleDb } = await dbReady();
    const {
      company_id,
      page = 0,
      limit = 10,
      sortBy = "date",
      sortOrder = "desc",
    } = params;

    const offset = Number(page) * Number(limit);

    // Determine column
    let column: any = invoices.date; // default
    if (sortBy === "total_amount") column = invoices.total_amount;
    else if (sortBy === "status") column = invoices.status;
    else if (sortBy === "invoice_number") column = invoices.invoice_number;
    else if (sortBy === "type") column = invoices.type;

    try {
      const rows = await drizzleDb
        .select()
        .from(invoices)
        .where(eq(invoices.company_id, String(company_id)))
        .orderBy(sortOrder === "asc" ? asc(column) : desc(column))
        .limit(Number(limit))
        .offset(Number(offset));

      return Array.isArray(rows) ? rows : [];
    } catch (err) {
      console.error("Drizzle query error:", err);
      return [];
    }
  };

  return {
    createInvoice,
    addInvoiceItem,
    generateInvoiceFromCart,
    markInvoicePaid,
    cancelInvoice,
    getInvoiceById,
    getCompanyInvoicesServer,
  };
}
