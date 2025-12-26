// db/seed.ts
import { v4 as uuidv4 } from "uuid";
import { useDb } from "./client.js";
import { migrate } from "./migrate.js";
import { createPinHash } from "../utils/pin.js";

/*********************************
 * HELPERS
 *********************************/
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/*********************************
 * SEED
 *********************************/
export async function seed(reset: boolean = true) {
  console.log("🚀 Starting seed...");

  await migrate(reset);
  const { db, persistDb } = await useDb();

  const now = Math.floor(Date.now() / 1000);

  // =====================================
  // SECURITY
  // =====================================
  const pinHash = await createPinHash("1234");

  // Use fixed COMPANY_ID to avoid CHECK constraint errors
  const COMPANY_ID = "LOCAL_COMPANY"; 
  const DEVICE_ID = `DEVICE-TEST`;
  const LICENSE_KEY = "BBX-OFFLINE-001";
  const LICENSE_TOKEN = "SIGNED_LICENSE_TOKEN_SAMPLE";
  const LICENSE_EXPIRY = now + 365 * 24 * 60 * 60;

  // =====================================
  // 1) COMPANY (SINGLE)
  // =====================================
  // Delete existing company if any
  db.exec(`DELETE FROM companies WHERE id='${COMPANY_ID}';`);

  db.exec(`
    INSERT INTO companies (
      id, name, email, phone, address,
      license_key, license_token, license_expiry,
      pin_hash, device_id,
      created_at, updated_at
    ) VALUES (
      '${COMPANY_ID}',
      'Bucksbox Retail Pvt Ltd',
      'info@bucksbox.in',
      '9876543210',
      'Chennai, Tamil Nadu',
      '${LICENSE_KEY}',
      '${LICENSE_TOKEN}',
      ${LICENSE_EXPIRY},
      '${pinHash}',
      '${DEVICE_ID}',
      ${now},
      ${now}
    );
  `);

  // =====================================
  // 2) CUSTOMERS + ADDRESSES
  // =====================================
  const customers: string[] = [];

  for (let i = 1; i <= 20; i++) {
    const cid = uuidv4();
    customers.push(cid);

    db.exec(`
      INSERT INTO customers (
        id, name, email, phone, company_id, created_at, updated_at
      ) VALUES (
        '${cid}',
        'Customer ${i}',
        'customer${i}@mail.com',
        '90000000${i}',
        '${COMPANY_ID}',
        ${now},
        ${now}
      );
    `);

    db.exec(`
      INSERT INTO customer_addresses (
        id, customer_id, address_line1, city, state, country, pincode,
        is_default, created_at, updated_at
      ) VALUES (
        '${uuidv4()}',
        '${cid}',
        'Street ${i}',
        'Chennai',
        'Tamil Nadu',
        'India',
        '6000${i}',
        1,
        ${now},
        ${now}
      );
    `);
  }

  // =====================================
  // 3) CATEGORIES + SUBCATEGORIES
  // =====================================
  const parentCategories: string[] = [];
  const subCategories: { id: string; parent: string }[] = [];

  const parentNames = [
    "Groceries",
    "Beverages",
    "Snacks",
    "Dairy",
    "Personal Care",
    "Home Essentials",
  ];

  for (const name of parentNames) {
    const parentId = uuidv4();
    parentCategories.push(parentId);

    db.exec(`
      INSERT INTO categories (
        id, name, description, company_id, parent_id,
        created_at, updated_at
      ) VALUES (
        '${parentId}',
        '${name}',
        '${name} category',
        '${COMPANY_ID}',
        NULL,
        ${now},
        ${now}
      );
    `);

    const subCount = rand(3, 5);
    for (let i = 1; i <= subCount; i++) {
      const subId = uuidv4();
      subCategories.push({ id: subId, parent: parentId });

      db.exec(`
        INSERT INTO categories (
          id, name, description, company_id, parent_id,
          created_at, updated_at
        ) VALUES (
          '${subId}',
          '${name} - Sub ${i}',
          '${name} subcategory ${i}',
          '${COMPANY_ID}',
          '${parentId}',
          ${now},
          ${now}
        );
      `);
    }
  }

  // =====================================
  // 4) PRODUCTS
  // =====================================
  const products: string[] = [];

  for (let i = 1; i <= 60; i++) {
    const id = uuidv4();
    products.push(id);

    const parent = parentCategories[rand(0, parentCategories.length - 1)];
    const subs = subCategories.filter((s) => s.parent === parent);
    const sub = subs[rand(0, subs.length - 1)];

    const price = rand(50, 500);
    const mrp = price + rand(20, 100);

    db.exec(`
      INSERT INTO products (
        id, name, sku, description,
        price, mrp,
        category_id, sub_category_id,
        company_id, created_at, updated_at
      ) VALUES (
        '${id}',
        'Product ${i}',
        'SKU-${i}',
        'Product description ${i}',
        ${price},
        ${mrp},
        '${parent}',
        '${sub.id}',
        '${COMPANY_ID}',
        ${now},
        ${now}
      );
    `);
  }

  // =====================================
  // 5) ITEMS
  // =====================================
  const items: { id: string; pid: string; price: number }[] = [];

  for (let i = 1; i <= 100; i++) {
    const id = uuidv4();
    const pid = products[rand(0, products.length - 1)];
    const price = rand(50, 600);

    items.push({ id, pid, price });

    db.exec(`
      INSERT INTO items (
        id, product_id, sku, variant,
        price, mrp, quantity,
        company_id, created_at, updated_at
      ) VALUES (
        '${id}',
        '${pid}',
        'ITEM-${i}',
        'Variant ${i}',
        ${price},
        ${price + 50},
        ${rand(1, 100)},
        '${COMPANY_ID}',
        ${now},
        ${now}
      );
    `);
  }

  // =====================================
  // 6) CARTS
  // =====================================
  const carts: string[] = [];

  for (const cust of customers) {
    const id = uuidv4();
    carts.push(id);

    db.exec(`
      INSERT INTO carts (
        id, customer_id, company_id, status, created_at, updated_at
      ) VALUES (
        '${id}',
        '${cust}',
        '${COMPANY_ID}',
        'ACTIVE',
        ${now},
        ${now}
      );
    `);
  }

  // =====================================
  // 7) CART ITEMS
  // =====================================
  for (let i = 0; i < rand(150, 300); i++) {
    const cart = carts[rand(0, carts.length - 1)];
    const item = items[rand(0, items.length - 1)];
    const qty = rand(1, 5);

    db.exec(`
      INSERT INTO cart_items (
        id, cart_id, item_id, product_id,
        quantity, price, total, created_at, updated_at
      ) VALUES (
        '${uuidv4()}',
        '${cart}',
        '${item.id}',
        '${item.pid}',
        ${qty},
        ${item.price},
        ${qty * item.price},
        ${now},
        ${now}
      );
    `);
  }

  // =====================================
  // 8) INVOICES + ITEMS + PAYMENTS
  // =====================================
  for (let i = 1; i <= 200; i++) {
    const invId = uuidv4();
    let total = 0;

    db.exec(`
      INSERT INTO invoices (
        id, invoice_number, company_id, customer_id,
        date, status, type, created_at, updated_at
      ) VALUES (
        '${invId}',
        'INV-${i}',
        '${COMPANY_ID}',
        '${customers[rand(0, customers.length - 1)]}',
        ${now},
        'PAID',
        'POS',
        ${now},
        ${now}
      );
    `);

    for (let j = 0; j < rand(1, 5); j++) {
      const item = items[rand(0, items.length - 1)];
      const qty = rand(1, 5);
      total += qty * item.price;

      db.exec(`
        INSERT INTO invoice_items (
          id, invoice_id, item_id, product_id,
          quantity, price, total, created_at, updated_at
        ) VALUES (
          '${uuidv4()}',
          '${invId}',
          '${item.id}',
          '${item.pid}',
          ${qty},
          ${item.price},
          ${qty * item.price},
          ${now},
          ${now}
        );
      `);
    }

    db.exec(`
      UPDATE invoices
      SET total_amount=${total}, tax_amount=${total * 0.18}
      WHERE id='${invId}';
    `);

    db.exec(`
      INSERT INTO payments (
        id, company_id, invoice_id,
        amount, method, date, created_at, updated_at
      ) VALUES (
        '${uuidv4()}',
        '${COMPANY_ID}',
        '${invId}',
        ${total},
        'CASH',
        ${now},
        ${now},
        ${now}
      );
    `);
  }

  await persistDb();
  console.log("🎉 Seed completed successfully!");
}
