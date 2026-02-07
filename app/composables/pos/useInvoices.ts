import { eq, desc, asc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  invoices,
  invoice_items,
  carts,
  parties,
  cart_items,
  tax_rates,
  products,
  items
} from "@/db/schema";

import { useDb } from "@/db/client.js";
import { enqueueSync } from "@/composables/pos/useSyncQueue";

const now = () => Date.now();

export function useInvoice() {
  /* ================= DB ================= */
  const dbReady = async () => {
    const { drizzleDb, persistDb } = await useDb();
    return { drizzleDb, persistDb };
  };

  /* ================= FETCH PARTIES ================= */
  const getPartiesByType = async (company_id: string, type: "CUSTOMER" | "VENDOR") => {
    const { drizzleDb } = await dbReady();

    return await drizzleDb
      .select()
      .from(parties)
      .where(
        sql`${parties.company_id} = ${company_id} AND (${parties.type} = ${type} OR ${parties.type} = 'BOTH')`
      );
  };

  const getAllProducts = async (company_id: string) => {
    const { drizzleDb } = await dbReady();

    const rows = await drizzleDb
      .select({
        product_id: products.id,
        product_name: products.name,
        item_id: items.id,
        sku: items.sku,
        variant: items.variant,
        price: items.price,
        quantity: items.quantity
      })
      .from(products)
      .leftJoin(items, eq(items.product_id, products.id))
      .where(eq(products.company_id, company_id));

    // Group items under each product
    const map = new Map();

    for (const r of rows) {
      if (!map.has(r.product_id)) {
        map.set(r.product_id, {
          product_id: r.product_id,
          product_name: r.product_name,
          items: []
        });
      }

      if (r.item_id) {
        map.get(r.product_id).items.push({
          item_id: r.item_id,
          sku: r.sku,
          variant: r.variant,
          price: r.price,
          quantity: r.quantity
        });
      }
    }

    return Array.from(map.values());
  };

  const getAllTaxRates = async (company_id: string) => {
    const { drizzleDb } = await dbReady();

    const rows = await drizzleDb
      .select()
      .from(tax_rates)
      .where(eq(tax_rates.company_id, company_id))
      .orderBy(asc(tax_rates.percentage));

    return rows.map(r => ({
      id: r.id,
      name: `${r.name} (${r.percentage}%)`,
      percent: r.percentage
    }));
  };

  /* ================= INVOICE ================= */
  const createInvoice = async (data: {
    company_id: string;
    party_id: string;
    type: "SALE" | "POS" | "PURCHASE" | "RETURN" | "EXPENSE" | "OTHER";
    items: Array<{
      product_id: string;
      item_id: string;
      quantity: number;
      price: number;
    }>;
    total_amount: number;
    tax_amount?: number;
    discount_amount?: number;
    due_date?: number;
  }) => {

    const { drizzleDb, persistDb } = await dbReady();

    const invoice_id = uuidv4();
    const invoice_number = `INV-${Date.now()}`;

    // 1️⃣ Create invoice
    await drizzleDb.insert(invoices).values({
      id: invoice_id,
      invoice_number,
      company_id: data.company_id,
      type: data.type,
      party_id: data.party_id,
      total_amount: data.total_amount,
      tax_amount: data.tax_amount ?? 0,
      due_date: data.due_date ?? null,
      status: "PENDING",
      date: now(),
      created_at: now(),
      updated_at: now(),
    });

    // 2️⃣ Insert invoice items
    for (const item of data.items) {
      await drizzleDb.insert(invoice_items).values({
        id: uuidv4(),
        invoice_id,
        product_id: item.product_id,
        item_id: item.item_id,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price,
        paid_amount: 0,
        status: "ORDERED",
        created_at: now(),
        updated_at: now(),
      });
    }

    await persistDb();
    return invoice_id;
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
  const getCompanyInvoicesServer = async (opts: {
    company_id: string;
    page?: number;        // zero-based
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    status?: string | null;
    type?: string | null;
    search?: string | null;
    dateStart?: number | null;
    dateEnd?: number | null;
  }) => {
    const { drizzleDb } = await dbReady();

    const page = opts.page ?? 0;
    const limit = opts.limit ?? 20;
    const offset = page * limit;

    const sortField = invoices[opts.sortBy ?? "date"] ?? invoices.date;
    const sortDirection = opts.sortOrder === "asc" ? asc : desc;

    // --------------------------
    // BUILD FILTER CONDITIONS
    // --------------------------
    const whereConditions = [
      eq(invoices.company_id, opts.company_id)
    ];

    // STATUS FILTER
    if (opts.status) {
      whereConditions.push(eq(invoices.status, opts.status));
    }

    // TYPE FILTER
    if (opts.type) {
      whereConditions.push(eq(invoices.type, opts.type));
    }

    // SEARCH FILTER
    if (opts.search) {
      whereConditions.push(
        sql`LOWER(${invoices.invoice_number}) LIKE LOWER('%' || ${opts.search} || '%')`
      );
    }

    // DATE RANGE
    if (opts.dateStart && opts.dateEnd) {
      whereConditions.push(
        sql`${invoices.date} BETWEEN ${opts.dateStart} AND ${opts.dateEnd}`
      );
    }

    // --------------------------
    // MAIN QUERY
    // --------------------------
    const rows = await drizzleDb
      .select()
      .from(invoices)
      .where(sql`${sql.join(whereConditions, sql` AND `)}`)
      .orderBy(sortDirection(sortField))
      .limit(limit)
      .offset(offset);

    return rows;
  };

  return {
    createInvoice,
    generateInvoiceFromCart,
    markInvoicePaid,
    cancelInvoice,
    getInvoiceById,
    getAllTaxRates,
    getCompanyInvoicesServer,
    getPartiesByType,
    getAllProducts,
  };
}
