import { eq, desc, asc, sql, and, inArray, SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { v4 as uuidv4 } from "uuid";
import {
  invoices,
  invoice_items,
  carts,
  parties,
  cart_items,
  tax_rates,
  products,
  items,
  party_addresses,  // ← add this
  companies,        // ← add this
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
        sql`${parties.company_id} = ${company_id}`
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

    const productsList = Array.from(map.values());

    console.log("[getAllProducts] fetched products:", productsList);

    return productsList;
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

const getCompanyInvoicesServer = async (opts: any) => {
  const { drizzleDb } = await dbReady();

  const page = opts.page ?? 0;
  const limit = opts.limit ?? 20;
  const offset = page * limit;

  let sortField: any = invoices.date;
  if (opts.sortBy === "total_amount")    sortField = invoices.total_amount;
  else if (opts.sortBy === "status")     sortField = invoices.status;
  else if (opts.sortBy === "invoice_number") sortField = invoices.invoice_number;

  const sortDirection = opts.sortOrder === "asc" ? asc : desc;

  const conditions: SQL[] = [eq(invoices.company_id, opts.company_id)];

  if (opts.status) conditions.push(eq(invoices.status, opts.status));
  if (opts.type)   conditions.push(eq(invoices.type,   opts.type));
  if (opts.search) conditions.push(
    sql`LOWER(${invoices.invoice_number}) LIKE LOWER('%' || ${opts.search} || '%')`
  );
  if (opts.dateStart && opts.dateEnd) conditions.push(
    sql`${invoices.date} BETWEEN ${opts.dateStart} AND ${opts.dateEnd}`
  );

  const billingAddr    = alias(party_addresses, "billing_addr");
  const shippingAddr   = alias(party_addresses, "shipping_addr");
  const invoiceCompany = alias(companies, "invoice_company");

  const rows = await drizzleDb
    .select({
      id:             invoices.id,
      invoice_number: invoices.invoice_number,
      type:           invoices.type,
      status:         invoices.status,
      date:           invoices.date,
      due_date:       invoices.due_date,
      total_amount:   invoices.total_amount,
      tax_amount:     invoices.tax_amount,
      created_at:     invoices.created_at,
      updated_at:     invoices.updated_at,

      party_id:           parties.id,
      party_name:         parties.name,
      party_email:        parties.email,
      party_phone:        parties.phone,
      party_gstin:        parties.gstin,
      party_type:         parties.type,
      party_credit_limit: parties.credit_limit,

      company_id:      invoiceCompany.id,
      company_name:    invoiceCompany.name,
      company_email:   invoiceCompany.email,
      company_phone:   invoiceCompany.phone,
      company_address: invoiceCompany.address,

      billing_address_id:    billingAddr.id,
      billing_address_line1: billingAddr.address_line1,
      billing_address_line2: billingAddr.address_line2,
      billing_address_line3: billingAddr.address_line3,
      billing_city:          billingAddr.city,
      billing_state:         billingAddr.state,
      billing_country:       billingAddr.country,
      billing_pincode:       billingAddr.pincode,

      shipping_address_id:    shippingAddr.id,
      shipping_address_line1: shippingAddr.address_line1,
      shipping_address_line2: shippingAddr.address_line2,
      shipping_address_line3: shippingAddr.address_line3,
      shipping_city:          shippingAddr.city,
      shipping_state:         shippingAddr.state,
      shipping_country:       shippingAddr.country,
      shipping_pincode:       shippingAddr.pincode,
    })
    .from(invoices)
    .leftJoin(parties,        eq(invoices.party_id,           parties.id))
    .leftJoin(invoiceCompany, eq(invoices.company_id,         invoiceCompany.id))
    .leftJoin(billingAddr,    eq(invoices.billing_address_id, billingAddr.id))
    .leftJoin(shippingAddr,   eq(invoices.shipping_address_id,shippingAddr.id))
    .where(and(...conditions))
    .orderBy(sortDirection(sortField))
    .limit(limit)
    .offset(offset);

  // ── Debug: always log before early return ───────────────────────
  console.log("[getCompanyInvoicesServer] opts:", {
    company_id: opts.company_id,
    page,
    limit,
    offset,
    status: opts.status,
    type: opts.type,
    search: opts.search,
  });

  console.log("[getCompanyInvoicesServer] rows fetched:", rows.length);

  if (rows.length === 0) return [];

  const invoiceIds = rows.map(r => r.id);

  const itemRows = await drizzleDb
    .select({
      ii_id:         invoice_items.id,
      invoice_id:    invoice_items.invoice_id,
      quantity:      invoice_items.quantity,
      price:         invoice_items.price,
      total:         invoice_items.total,
      paid_amount:   invoice_items.paid_amount,
      item_status:   invoice_items.status,
      ii_created_at: invoice_items.created_at,

      item_id:      items.id,
      item_sku:     items.sku,
      item_variant: items.variant,
      item_mrp:     items.mrp,

      product_id:   products.id,
      product_name: products.name,
      product_sku:  products.sku,

      tax_rate_id:    tax_rates.id,
      tax_rate_name:  tax_rates.name,
      tax_percentage: tax_rates.percentage,
    })
    .from(invoice_items)
    .leftJoin(items,     eq(invoice_items.item_id,     items.id))
    .leftJoin(products,  eq(invoice_items.product_id,  products.id))
    .leftJoin(tax_rates, eq(invoice_items.tax_rate_id, tax_rates.id))
    .where(inArray(invoice_items.invoice_id, invoiceIds));

  const itemsByInvoice = itemRows.reduce<Record<string, any[]>>((acc, item) => {
    if (!acc[item.invoice_id]) acc[item.invoice_id] = [];
    acc[item.invoice_id].push({
      id:          item.ii_id,
      invoice_id:  item.invoice_id,
      quantity:    item.quantity,
      price:       item.price,
      total:       item.total,
      paid_amount: item.paid_amount,
      status:      item.item_status,
      created_at:  item.ii_created_at,
      item: {
        id:      item.item_id,
        sku:     item.item_sku,
        variant: item.item_variant,
        mrp:     item.item_mrp,
      },
      product: {
        id:   item.product_id,
        name: item.product_name,
        sku:  item.product_sku,
      },
      tax_rate: item.tax_rate_id ? {
        id:         item.tax_rate_id,
        name:       item.tax_rate_name,
        percentage: item.tax_percentage,
      } : null,
    });
    return acc;
  }, {});

  const result = rows.map(r => ({
    id:             r.id,
    invoice_number: r.invoice_number,
    type:           r.type,
    status:         r.status,
    date:           r.date,
    due_date:       r.due_date,
    total_amount:   r.total_amount,
    tax_amount:     r.tax_amount,
    created_at:     r.created_at,
    updated_at:     r.updated_at,

    party: r.party_id ? {
      id:           r.party_id,
      name:         r.party_name,
      email:        r.party_email,
      phone:        r.party_phone,
      gstin:        r.party_gstin,
      type:         r.party_type,
      credit_limit: r.party_credit_limit,
    } : null,

    company: r.company_id ? {
      id:      r.company_id,
      name:    r.company_name,
      email:   r.company_email,
      phone:   r.company_phone,
      address: r.company_address,
    } : null,

    billing_address: r.billing_address_id ? {
      id:      r.billing_address_id,
      line1:   r.billing_address_line1,
      line2:   r.billing_address_line2,
      line3:   r.billing_address_line3,
      city:    r.billing_city,
      state:   r.billing_state,
      country: r.billing_country,
      pincode: r.billing_pincode,
    } : null,

    shipping_address: r.shipping_address_id ? {
      id:      r.shipping_address_id,
      line1:   r.shipping_address_line1,
      line2:   r.shipping_address_line2,
      line3:   r.shipping_address_line3,
      city:    r.shipping_city,
      state:   r.shipping_state,
      country: r.shipping_country,
      pincode: r.shipping_pincode,
    } : null,

    items: itemsByInvoice[r.id] ?? [],
  }));

  console.log("[getCompanyInvoicesServer] assembled invoices:", result);

  return result;
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