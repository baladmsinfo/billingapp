import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/*********************************
 * COMPANIES
 *********************************/
export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  license_key: text("license_key").notNull(),
  license_token: text("license_token").notNull(),
  license_expiry: integer("license_expiry"),
  grace_until: integer("grace_until"),
  pin_hash: text("pin_hash").notNull(),
  pin_attempts: integer("pin_attempts").default(0),
  pin_locked_until: integer("pin_locked_until"),
  device_id: text("device_id").notNull(),
  last_sync_at: integer("last_sync_at"),
  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * PARTIES
 *********************************/
export const parties = sqliteTable("parties", {
  id: text("id").primaryKey(),
  company_id: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // CUSTOMER | VENDOR | BOTH
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  gstin: text("gstin"),
  opening_balance: real("opening_balance").default(0),
  credit_limit: real("credit_limit").default(0),
  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * TAX RATES
 *********************************/
export const tax_rates = sqliteTable("tax_rates", {
  id: text("id").primaryKey(),
  company_id: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // GST 5%, GST 12%, VAT 10%, etc.
  percentage: real("percentage").notNull(), // 5, 12, 18 etc.
  description: text("description"),
  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});


/*********************************
 * PARTY ADDRESSES
 *********************************/
export const party_addresses = sqliteTable("party_addresses", {
  id: text("id").primaryKey(),
  party_id: text("party_id").notNull().references(() => parties.id, { onDelete: "cascade" }),
  address_line1: text("address_line1"),
  address_line2: text("address_line2"),
  address_line3: text("address_line3"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  pincode: text("pincode"),
  address_type: text("address_type").default("BILLING"), // BILLING | SHIPPING
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
  company_id: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  parent_id: text("parent_id").references(() => categories.id, { onDelete: "set null" }),
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
  category_id: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  sub_category_id: text("sub_category_id").references(() => categories.id, { onDelete: "set null" }),
  company_id: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * ITEMS
 *********************************/
export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  product_id: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sku: text("sku"),
  variant: text("variant"),
  price: real("price").default(0),
  mrp: real("mrp"),
  quantity: integer("quantity").default(0),
  tax_rate_id: text("tax_rate_id").references(() => tax_rates.id, { onDelete: "set null" }),
  company_id: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * CARTS
 *********************************/
export const carts = sqliteTable("carts", {
  id: text("id").primaryKey(),
  party_id: text("party_id").references(() => parties.id, { onDelete: "set null" }),
  party_address_id: text("party_address_id").references(() => party_addresses.id, { onDelete: "set null" }),
  company_id: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  status: text("status").default("PENDING"), // DRAFT | HOLD | PENDING | ACTIVE | CHECKEDOUT | CANCELLED
  created_at: integer("created_at"),
  updated_at: integer("updated_at"),
});

/*********************************
 * CART ITEMS
 *********************************/
export const cart_items = sqliteTable("cart_items", {
  id: text("id").primaryKey(),
  cart_id: text("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  item_id: text("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  product_id: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1),
  price: real("price").default(0),
  tax_rate_id: text("tax_rate_id").references(() => tax_rates.id, { onDelete: "set null" }),
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
  company_id: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  party_id: text("party_id").references(() => parties.id, { onDelete: "set null" }),
  billing_address_id: text("billing_address_id").references(() => party_addresses.id, { onDelete: "set null" }),
  shipping_address_id: text("shipping_address_id").references(() => party_addresses.id, { onDelete: "set null" }),
  date: integer("date"),
  due_date: integer("due_date"),
  status: text("status").default("PENDING"), // PENDING | PARTIAL | PAYLATER | PAID | CANCELLED
  type: text("type").default("SALE"), // SALE | POS | PURCHASE | RETURN | EXPENSE | OTHER
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
  invoice_id: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  item_id: text("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  product_id: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1),
  price: real("price").default(0),
  status: text("status").default("ORDERED"), // ORDERED | PROCESSING | SHIPPED | DELIVERED | CANCELLED | RETURNED
  tax_rate_id: text("tax_rate_id").references(() => tax_rates.id, { onDelete: "set null" }),
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
  company_id: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  invoice_id: text("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  party_id: text("party_id").references(() => parties.id, { onDelete: "set null" }),
  amount: real("amount").default(0),
  type: text("type").notNull().default("FULL"), // ADVANCE | PARTIAL | FULL | REFUND
  method: text("method").default("CASH"), // CASH | BANK_TRANSFER | UPI | CHEQUE | CARD | OTHER
  reference_no: text("reference_no"),
  gateway_payment_id: text("gateway_payment_id"),
  raw_response: text("raw_response"),
  note: text("note"),
  status: text("status").default("SUCCESS"), // SUCCESS | REFUNDED | FAILED
  date: integer("date").notNull(),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
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
