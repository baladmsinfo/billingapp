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
  // SECURITY / COMPANY
  // =====================================
  const pinHash = await createPinHash("1234");
  const COMPANY_ID = "LOCAL_COMPANY";
  const DEVICE_ID = `DEVICE-TEST`;
  const LICENSE_KEY = "BBX-OFFLINE-001";
  const LICENSE_TOKEN = "SIGNED_LICENSE_TOKEN_SAMPLE";
  const LICENSE_EXPIRY = now + 365 * 24 * 60 * 60;

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
  // PARTIES (CUSTOMERS + VENDORS)
  // =====================================
  const customers: string[] = [];
  const vendors: string[] = [];

  for (let i = 1; i <= 20; i++) {
    const pid = uuidv4();
    customers.push(pid);

    db.exec(`
      INSERT INTO parties (
        id, type, name, email, phone, company_id, created_at, updated_at
      ) VALUES (
        '${pid}',
        'CUSTOMER',
        'Customer ${i}',
        'customer${i}@mail.com',
        '90000000${i}',
        '${COMPANY_ID}',
        ${now},
        ${now}
      );
    `);

    db.exec(`
      INSERT INTO party_addresses (
        id, party_id, address_line1, city, state, country, pincode, is_default, created_at, updated_at
      ) VALUES (
        '${uuidv4()}',
        '${pid}',
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

  for (let i = 1; i <= 10; i++) {
    const pid = uuidv4();
    vendors.push(pid);

    db.exec(`
      INSERT INTO parties (
        id, type, name, email, phone, company_id, created_at, updated_at
      ) VALUES (
        '${pid}',
        'VENDOR',
        'Vendor ${i}',
        'vendor${i}@mail.com',
        '80000000${i}',
        '${COMPANY_ID}',
        ${now},
        ${now}
      );
    `);

    db.exec(`
      INSERT INTO party_addresses (
        id, party_id, address_line1, city, state, country, pincode, is_default, created_at, updated_at
      ) VALUES (
        '${uuidv4()}',
        '${pid}',
        'Vendor Street ${i}',
        'Chennai',
        'Tamil Nadu',
        'India',
        '6001${i}',
        1,
        ${now},
        ${now}
      );
    `);
  }

  // =====================================
  // CATEGORIES + SUBCATEGORIES
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
        id, name, description, company_id, parent_id, created_at, updated_at
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
          id, name, description, company_id, parent_id, created_at, updated_at
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

  // ===============================
  // PRODUCTS + ITEMS (NO VENDOR LINK)
  // ===============================
  const productIds: string[] = [];
  const itemList: { id: string; pid: string; price: number }[] = [];

  for (let i = 1; i <= 60; i++) {
    const productId = uuidv4();
    productIds.push(productId);

    const parent = parentCategories[rand(0, parentCategories.length - 1)];
    const subs = subCategories.filter((s) => s.parent === parent);
    const sub = subs[rand(0, subs.length - 1)];

    const basePrice = rand(50, 500);
    const mrp = basePrice + rand(20, 100);

    db.exec(`
    INSERT INTO products (
      id, name, sku, description,
      price, mrp,
      category_id, sub_category_id,
      company_id, created_at, updated_at
    ) VALUES (
      '${productId}',
      'Product ${i}',
      'SKU-${i}',
      'Product description ${i}',
      ${basePrice},
      ${mrp},
      '${parent}',
      '${sub.id}',
      '${COMPANY_ID}',
      ${now},
      ${now}
    );
  `);

    // Create ONLY company-owned items
    const variantCount = rand(1, 3);
    for (let v = 1; v <= variantCount; v++) {
      const itemId = uuidv4();
      const variantPrice = basePrice + rand(0, 50);

      itemList.push({ id: itemId, pid: productId, price: variantPrice });

      db.exec(`
      INSERT INTO items (
        id, product_id, sku, variant,
        price, mrp, quantity,
        company_id, created_at, updated_at
      ) VALUES (
        '${itemId}',
        '${productId}',
        'ITEM-${i}-${v}',
        'Variant ${v}',
        ${variantPrice},
        ${variantPrice + 50},
        ${rand(5, 100)},
        '${COMPANY_ID}',
        ${now},
        ${now}
      );
    `);
    }
  }

  // =====================================
  // CARTS + CART ITEMS
  // =====================================
  const carts: string[] = [];
  for (const cust of customers) {
    const cartId = uuidv4();
    carts.push(cartId);

    db.exec(`
      INSERT INTO carts (
        id, party_id, company_id, status, created_at, updated_at
      ) VALUES (
        '${cartId}',
        '${cust}',
        '${COMPANY_ID}',
        'ACTIVE',
        ${now},
        ${now}
      );
    `);

    const cartItemCount = rand(2, 5);
    for (let ci = 0; ci < cartItemCount; ci++) {
      const item = itemList[rand(0, itemList.length - 1)];
      const qty = rand(1, 5);

      db.exec(`
        INSERT INTO cart_items (
          id, cart_id, item_id, product_id, quantity, price, total, created_at, updated_at
        ) VALUES (
          '${uuidv4()}',
          '${cartId}',
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
  }

  // =====================================
  // INVOICES + ITEMS + PAYMENTS (party optional)
  // =====================================
  for (let i = 1; i <= 100; i++) {
    const invoiceId = uuidv4();

    // randomly decide if invoice has a party
    const hasParty = Math.random() > 0.2; // 80% invoices linked
    const buyer = hasParty ? customers[rand(0, customers.length - 1)] : null;

    db.exec(`
      INSERT INTO invoices (
        id, invoice_number, company_id, party_id, date, status, type, created_at, updated_at
      ) VALUES (
        '${invoiceId}',
        'INV-${i}',
        '${COMPANY_ID}',
        ${buyer ? `'${buyer}'` : "NULL"},
        ${now},
        'PAID',
        'POS',
        ${now},
        ${now}
      );
    `);

    let total = 0;
    const lineCount = rand(1, 5);
    for (let j = 0; j < lineCount; j++) {
      const item = itemList[rand(0, itemList.length - 1)];
      const qty = rand(1, 5);
      total += qty * item.price;

      db.exec(`
        INSERT INTO invoice_items (
          id, invoice_id, item_id, product_id, quantity, price, total, created_at, updated_at
        ) VALUES (
          '${uuidv4()}',
          '${invoiceId}',
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
      WHERE id='${invoiceId}';
    `);

    if (buyer) {
      db.exec(`
        INSERT INTO payments (
          id, company_id, invoice_id, party_id,
          amount, method, date, created_at, updated_at, type
        ) VALUES (
          '${uuidv4()}',
          '${COMPANY_ID}',
          '${invoiceId}',
          '${buyer}',
          ${total},
          'CASH',
          ${now},
          ${now},
          ${now},
          'FULL'
        );
      `);
    }
  }

  await persistDb();
  console.log("🎉 Seed completed successfully!");
}
