// db/schema.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/*********************************
 * COMPANIES (SINGLE COMPANY POS)
 *********************************/
export const companies = sqliteTable("companies", {
  // Always store only ONE row: id = 'LOCAL_COMPANY'
  id: text("id").primaryKey(),

  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),

  // License
  license_key: text("license_key").notNull(),
  license_token: text("license_token").notNull(), // signed JWT / HMAC token
  license_expiry: integer("license_expiry"),       // unix timestamp
  grace_until: integer("grace_until"),

  // Security
  pin_hash: text("pin_hash").notNull(),
  pin_attempts: integer("pin_attempts").default(0),
  pin_locked_until: integer("pin_locked_until"),

  // Device binding
  device_id: text("device_id").notNull(),

  // Sync
  last_sync_at: integer("last_sync_at"),

  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * CUSTOMERS
 *********************************/
export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  gstin: text("gstin"),

  company_id: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * CUSTOMER ADDRESSES
 *********************************/
export const customer_addresses = sqliteTable("customer_addresses", {
  id: text("id").primaryKey(),
  customer_id: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),

  address_line1: text("address_line1"),
  address_line2: text("address_line2"),
  address_line3: text("address_line3"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  pincode: text("pincode"),

  is_default: integer("is_default").default(0),

  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * CATEGORIES
 *********************************/
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),

  company_id: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  parent_id: text("parent_id"),

  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * PRODUCTS
 *********************************/
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku"),
  description: text("description"),

  price: real("price").default(0),
  mrp: real("mrp"),

  category_id: text("category_id").references(() => categories.id),
  sub_category_id: text("sub_category_id").references(() => categories.id),

  company_id: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * ITEMS (STOCK / VARIANTS)
 *********************************/
export const items = sqliteTable("items", {
  id: text("id").primaryKey(),

  product_id: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),

  sku: text("sku"),
  variant: text("variant"),

  price: real("price").default(0),
  mrp: real("mrp"),
  quantity: integer("quantity").default(0),
  location: text("location"),

  tax_rate_id: text("tax_rate_id"),

  company_id: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * VENDORS
 *********************************/
export const vendors = sqliteTable("vendors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  gstin: text("gstin"),

  company_id: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * CARTS
 *********************************/
export const carts = sqliteTable("carts", {
  id: text("id").primaryKey(),

  customer_id: text("customer_id").references(() => customers.id),

  company_id: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  status: text("status").default("ACTIVE"),

  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * CART ITEMS
 *********************************/
export const cart_items = sqliteTable("cart_items", {
  id: text("id").primaryKey(),

  cart_id: text("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),

  item_id: text("item_id")
    .notNull()
    .references(() => items.id),

  product_id: text("product_id")
    .notNull()
    .references(() => products.id),

  quantity: integer("quantity").default(1),
  price: real("price").default(0),
  tax_rate_id: text("tax_rate_id"),
  total: real("total").default(0),

  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * INVOICES
 *********************************/
export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  invoice_number: text("invoice_number"),

  company_id: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  customer_id: text("customer_id").references(() => customers.id),
  vendor_id: text("vendor_id").references(() => vendors.id),

  date: integer("date"),
  due_date: integer("due_date"),

  status: text("status").default("PENDING"),
  type: text("type").default("POS"),

  total_amount: real("total_amount").default(0),
  tax_amount: real("tax_amount").default(0),

  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * INVOICE ITEMS
 *********************************/
export const invoice_items = sqliteTable("invoice_items", {
  id: text("id").primaryKey(),

  invoice_id: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),

  item_id: text("item_id")
    .notNull()
    .references(() => items.id),

  product_id: text("product_id")
    .notNull()
    .references(() => products.id),

  quantity: integer("quantity").default(1),
  price: real("price").default(0),

  status: text("status").default("ORDERED"),
  tax_rate_id: text("tax_rate_id"),

  total: real("total").default(0),
  paid_amount: real("paid_amount").default(0),

  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * PAYMENTS
 *********************************/
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),

  company_id: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  invoice_id: text("invoice_id").references(() => invoices.id),

  amount: real("amount").default(0),
  method: text("method").default("CASH"),

  gateway_payment_id: text("gateway_payment_id"),
  raw_response: text("raw_response"),
  reference_no: text("reference_no"),
  date: integer("date"),
  note: text("note"),

  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * SYNC QUEUE
 *********************************/
export const sync_queue = sqliteTable("sync_queue", {
  id: text("id").primaryKey(),
  entity: text("entity").notNull(),
  entity_id: text("entity_id").notNull(),
  action: text("action").notNull(),
  payload: text("payload"),
  status: text("status").default("PENDING"),
  retry_count: integer("retry_count").default(0),
  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});
