// db/composables.js
import { useDb } from "./client.js";

// ------------------ Helper to get db ----------------
async function getDb() {
  const { drizzleDb } = await useDb();
  if (!drizzleDb) throw new Error("Database not initialized");
  return drizzleDb;
}

// ------------------ Products with Items & Filters ----------------
export async function getProductsWithItems({
  categoryId = null,
  search = "",
  minPrice = 0,
  maxPrice = Infinity,
  limit = null,
  offset = 0,
} = {}) {
  const db = await getDb();

  let query = `
    SELECT 
      p.id AS product_id, p.name AS product_name, p.sku, p.description, p.price, p.mrp, 
      p.category_id, c.name AS category_name,
      i.id AS item_id, i.sku AS item_sku, i.variant, i.price AS item_price, i.mrp AS item_mrp, i.quantity
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN items i ON i.product_id = p.id
    WHERE 1=1
  `;

  const params = [];
  if (categoryId) {
    query += " AND p.category_id = ?";
    params.push(categoryId);
  }
  if (search) {
    query += " AND p.name LIKE ?";
    params.push(`%${search}%`);
  }
  query += " AND p.price >= ? AND p.price <= ?";
  params.push(minPrice, maxPrice);

  query += " ORDER BY p.name ASC";

  if (limit !== null) query += ` LIMIT ${limit} OFFSET ${offset}`;

  const rows = db.query(query, params);

  const result = {};
  for (const row of rows) {
    if (!result[row.product_id]) {
      result[row.product_id] = {
        id: row.product_id,
        name: row.product_name,
        sku: row.sku,
        description: row.description,
        price: row.price,
        mrp: row.mrp,
        category: { id: row.category_id, name: row.category_name },
        items: [],
      };
    }
    if (row.item_id) {
      result[row.product_id].items.push({
        id: row.item_id,
        sku: row.item_sku,
        variant: row.variant,
        price: row.item_price,
        mrp: row.item_mrp,
        quantity: row.quantity,
      });
    }
  }

  return Object.values(result);
}

// ------------------ Categories with Subcategories ----------------
export async function getCategoriesWithSubcategories({ limit = null, offset = 0 } = {}) {
  const db = await getDb();

  let query = `
    SELECT 
      c1.id AS category_id, c1.name AS category_name, c1.parent_id,
      c2.id AS subcategory_id, c2.name AS subcategory_name
    FROM categories c1
    LEFT JOIN categories c2 ON c2.parent_id = c1.id
    ORDER BY c1.name ASC
  `;

  if (limit !== null) query += ` LIMIT ${limit} OFFSET ${offset}`;

  const rows = db.query(query);

  const result = {};
  for (const row of rows) {
    if (!result[row.category_id]) {
      result[row.category_id] = {
        id: row.category_id,
        name: row.category_name,
        subcategories: [],
      };
    }
    if (row.subcategory_id) {
      result[row.category_id].subcategories.push({
        id: row.subcategory_id,
        name: row.subcategory_name,
      });
    }
  }

  return Object.values(result);
}

// ------------------ Carts with Items & Filters ----------------
export async function getCartsWithItems({
  customerId = null,
  status = null,
  limit = null,
  offset = 0,
} = {}) {
  const db = await getDb();

  let query = `
    SELECT 
      c.id AS cart_id, c.customer_id, c.company_id, c.status,
      ci.id AS cart_item_id, ci.item_id, ci.product_id, ci.quantity, ci.price, ci.total,
      i.sku AS item_sku, i.variant, p.name AS product_name
    FROM carts c
    LEFT JOIN cart_items ci ON ci.cart_id = c.id
    LEFT JOIN items i ON i.id = ci.item_id
    LEFT JOIN products p ON p.id = ci.product_id
    WHERE 1=1
  `;
  const params = [];
  if (customerId) {
    query += " AND c.customer_id = ?";
    params.push(customerId);
  }
  if (status) {
    query += " AND c.status = ?";
    params.push(status);
  }

  query += " ORDER BY c.id ASC";

  if (limit !== null) query += ` LIMIT ${limit} OFFSET ${offset}`;

  const rows = db.query(query, params);

  const result = {};
  for (const row of rows) {
    if (!result[row.cart_id]) {
      result[row.cart_id] = {
        id: row.cart_id,
        customer_id: row.customer_id,
        company_id: row.company_id,
        status: row.status,
        items: [],
      };
    }
    if (row.cart_item_id) {
      result[row.cart_id].items.push({
        id: row.cart_item_id,
        item_id: row.item_id,
        product_id: row.product_id,
        product_name: row.product_name,
        sku: row.item_sku,
        variant: row.variant,
        quantity: row.quantity,
        price: row.price,
        total: row.total,
      });
    }
  }

  return Object.values(result);
}

// ------------------ Invoices with Items & Filters ----------------
export async function getInvoicesWithItems({
  customerId = null,
  status = null,
  startDate = null,
  endDate = null,
  limit = null,
  offset = 0,
} = {}) {
  const db = await getDb();

  let query = `
    SELECT 
      inv.id AS invoice_id, inv.invoice_number, inv.customer_id, inv.company_id, inv.total_amount, inv.tax_amount,
      ii.id AS invoice_item_id, ii.item_id, ii.product_id, ii.quantity, ii.price, ii.total,
      i.sku AS item_sku, i.variant, p.name AS product_name
    FROM invoices inv
    LEFT JOIN invoice_items ii ON ii.invoice_id = inv.id
    LEFT JOIN items i ON i.id = ii.item_id
    LEFT JOIN products p ON p.id = ii.product_id
    WHERE 1=1
  `;

  const params = [];
  if (customerId) {
    query += " AND inv.customer_id = ?";
    params.push(customerId);
  }
  if (status) {
    query += " AND inv.status = ?";
    params.push(status);
  }
  if (startDate) {
    query += " AND inv.date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND inv.date <= ?";
    params.push(endDate);
  }

  query += " ORDER BY inv.date DESC";

  if (limit !== null) query += ` LIMIT ${limit} OFFSET ${offset}`;

  const rows = db.query(query, params);

  const result = {};
  for (const row of rows) {
    if (!result[row.invoice_id]) {
      result[row.invoice_id] = {
        id: row.invoice_id,
        invoice_number: row.invoice_number,
        customer_id: row.customer_id,
        company_id: row.company_id,
        total_amount: row.total_amount,
        tax_amount: row.tax_amount,
        items: [],
      };
    }
    if (row.invoice_item_id) {
      result[row.invoice_id].items.push({
        id: row.invoice_item_id,
        item_id: row.item_id,
        product_id: row.product_id,
        product_name: row.product_name,
        sku: row.item_sku,
        variant: row.variant,
        quantity: row.quantity,
        price: row.price,
        total: row.total,
      });
    }
  }

  return Object.values(result);
}



// // Get first 10 products of a category
// const products = await getProductsWithItems({ categoryId: "cat-123", limit: 10, offset: 0 });

// // Get next 10
// const nextProducts = await getProductsWithItems({ categoryId: "cat-123", limit: 10, offset: 10 });

// // Paginate invoices for a customer
// const invoices = await getInvoicesWithItems({ customerId: "cust-1", limit: 20, offset: 0 });

// const { data: products, total } = await getProductsWithItems({ limit: 10, offset: 0 });
// console.log("Total products:", total, "Page data:", products);

// const { data: invoices, total: invTotal } = await getInvoicesWithItems({ customerId: "cust-1", limit: 20, offset: 0 });