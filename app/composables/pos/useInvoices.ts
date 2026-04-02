import { eq, desc, asc, sql, and } from "drizzle-orm";
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

  /* ================= PRODUCTS ================= */
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

  /* ================= TAX ================= */
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

  /* ================= CREATE INVOICE ================= */
  const createInvoice = async (data: any) => {
    const { drizzleDb, persistDb } = await dbReady();

    const invoice_id = uuidv4();
    const invoice_number = `INV-${Date.now()}`;

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
      date: data.date,
      created_at: now(),
      updated_at: now(),
    });

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

  /* ================= GET INVOICE BY ID ================= */
  const getInvoiceById = async (invoice_id: string) => {
    const { drizzleDb } = await dbReady();

    const [invoice] = await drizzleDb
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoice_id))
      .limit(1);

    if (!invoice) return null;

    const itemsData = await drizzleDb
      .select({
        id: invoice_items.id,
        quantity: invoice_items.quantity,
        price: invoice_items.price,
        total: invoice_items.total,
        status: invoice_items.status,
        product_id: products.id,
        product_name: products.name,
      })
      .from(invoice_items)
      .leftJoin(products, eq(invoice_items.product_id, products.id))
      .where(eq(invoice_items.invoice_id, invoice_id));

    return {
      ...invoice,
      items: itemsData,
    };
  };

  /* ================= GET INVOICES (FIXED) ================= */
  const getCompanyInvoicesServer = async (opts: any) => {
    const { drizzleDb } = await dbReady();

    const page = opts.page ?? 0;
    const limit = opts.limit ?? 20;
    const offset = page * limit;

   
    let sortField = invoices.date;

    if (opts.sortBy === "total_amount") {
      sortField = invoices.total_amount;
    } else if (opts.sortBy === "status") {
      sortField = invoices.status;
    } else if (opts.sortBy === "invoice_number") {
      sortField = invoices.invoice_number;
    }

    const sortDirection = opts.sortOrder === "asc" ? asc : desc;

    
    const conditions: any[] = [
      eq(invoices.company_id, opts.company_id)
    ];

    if (opts.status) {
      conditions.push(eq(invoices.status, opts.status));
    }

    if (opts.type) {
      conditions.push(eq(invoices.type, opts.type));
    }

    if (opts.search) {
      conditions.push(
        sql`LOWER(${invoices.invoice_number}) LIKE LOWER('%' || ${opts.search} || '%')`
      );
    }

    if (opts.dateStart && opts.dateEnd) {
      conditions.push(
        sql`${invoices.date} BETWEEN ${opts.dateStart} AND ${opts.dateEnd}`
      );
    }

    
    const rows = await drizzleDb
      .select({
       
        invoiceNumber: invoices.invoice_number,
        type: invoices.type,
        status: invoices.status,
         partyname: parties.name,
        totalamount: invoices.total_amount,
        taxamount: invoices.tax_amount,
        date: invoices.date,
        due_date: invoices.due_date,

        
      })
      .from(invoices)
      .leftJoin(parties, eq(invoices.party_id, parties.id))
      .where(and(...conditions)) 
      .orderBy(sortDirection(sortField))
      .limit(limit)
      .offset(offset);

    return rows;
  };

  return {
    createInvoice,
    getInvoiceById,
    getAllTaxRates,
    getCompanyInvoicesServer,
    getPartiesByType,
    getAllProducts,
  };
}