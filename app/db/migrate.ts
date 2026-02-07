// db/migrate.ts
import { useDb } from "./client.js";

export async function migrate(reset: boolean = false): Promise<void> {
  const { db, persistDb } = await useDb();

  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec("BEGIN TRANSACTION;");

  try {
    // ------------------ RESET MODE ------------------
    if (reset) {
      const tables =
        db.exec(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
        )[0]?.values ?? [];

      for (const [table] of tables) {
        db.exec(`DROP TABLE IF EXISTS ${table};`);
      }

      console.log("🗑️ All tables dropped (reset mode).");
    }

    db.exec("PRAGMA foreign_keys = ON;");

    // =================================================
    // 🏢 COMPANIES
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY CHECK (id = 'LOCAL_COMPANY'),
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        license_key TEXT NOT NULL,
        license_token TEXT NOT NULL,
        pin_hash TEXT NOT NULL,
        device_id TEXT NOT NULL,
        license_expiry INTEGER,
        grace_until INTEGER,
        last_sync_at INTEGER,
        pin_attempts INTEGER DEFAULT 0,
        pin_locked_until INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    // =================================================
    // 👥 PARTIES
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS parties (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        parent_party_id TEXT,
        type TEXT NOT NULL CHECK(type IN ('CUSTOMER','VENDOR','BOTH')),
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        gstin TEXT,
        opening_balance REAL DEFAULT 0,
        credit_limit REAL DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
    `);

    // =================================================
    // 📍 PARTY ADDRESSES
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS party_addresses (
        id TEXT PRIMARY KEY,
        party_id TEXT NOT NULL,
        address_line1 TEXT,
        address_line2 TEXT,
        address_line3 TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        pincode TEXT,
        address_type TEXT DEFAULT 'BILLING' CHECK(address_type IN ('BILLING','SHIPPING')),
        is_default INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(party_id) REFERENCES parties(id) ON DELETE CASCADE
      );
    `);

    // =================================================
    // 🗂️ CATEGORIES
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        company_id TEXT NOT NULL,
        parent_id TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE SET NULL
      );
    `);

    // =================================================
    // 💸 TAX RATES
    // =================================================
    db.exec(`
  CREATE TABLE IF NOT EXISTS tax_rates (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    percentage REAL NOT NULL,
    description TEXT,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
`);

    // =================================================
    // 📦 PRODUCTS
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT,
        description TEXT,
        price REAL DEFAULT 0,
        mrp REAL,
        category_id TEXT,
        sub_category_id TEXT,
        company_id TEXT NOT NULL,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY(sub_category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
    `);

    // =================================================
    // 📦 ITEMS
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      sku TEXT,
      variant TEXT,
      price REAL DEFAULT 0,
      mrp REAL,
      quantity INTEGER DEFAULT 0,
      tax_rate_id TEXT,
      company_id TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY(tax_rate_id) REFERENCES tax_rates(id) ON DELETE SET NULL,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
    `);

    // =================================================
    // 🛒 CARTS
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS carts (
        id TEXT PRIMARY KEY,
        party_id TEXT,
        party_address_id TEXT,
        company_id TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('DRAFT','HOLD','PENDING','ACTIVE','CHECKEDOUT','CANCELLED')),
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(party_id) REFERENCES parties(id) ON DELETE SET NULL,
        FOREIGN KEY(party_address_id) REFERENCES party_addresses(id) ON DELETE SET NULL,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
    `);

    // =================================================
    // 🛒 CART ITEMS
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id TEXT PRIMARY KEY,
        cart_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        price REAL DEFAULT 0,
        tax_rate_id TEXT,
        total REAL DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(tax_rate_id) REFERENCES tax_rates(id) ON DELETE SET NULL,
        FOREIGN KEY(cart_id) REFERENCES carts(id) ON DELETE CASCADE,
        FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    // =================================================
    // 🧾 INVOICES
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT,
        company_id TEXT NOT NULL,
        party_id TEXT,
        billing_address_id TEXT,
        shipping_address_id TEXT,
        date INTEGER,
        due_date INTEGER,
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','PARTIAL','PAYLATER','PAID','CANCELLED')),
        type TEXT DEFAULT 'SALE' CHECK(type IN ('SALE','POS','PURCHASE','RETURN','EXPENSE','OTHER')),
        total_amount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY(party_id) REFERENCES parties(id) ON DELETE SET NULL,
        FOREIGN KEY(billing_address_id) REFERENCES party_addresses(id) ON DELETE SET NULL,
        FOREIGN KEY(shipping_address_id) REFERENCES party_addresses(id) ON DELETE SET NULL
      );
    `);

    // =================================================
    // 🧾 INVOICE ITEMS
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        price REAL DEFAULT 0,
        status TEXT DEFAULT 'ORDERED' CHECK(status IN ('ORDERED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','RETURNED')),
        tax_rate_id TEXT,
        total REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(tax_rate_id) REFERENCES tax_rates(id) ON DELETE SET NULL,
        FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    // =================================================
    // 💰 PAYMENTS
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        invoice_id TEXT,
        party_id TEXT,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('ADVANCE','PARTIAL','FULL','REFUND','PAYLATER')),
        method TEXT DEFAULT 'CASH' CHECK(method IN ('CASH','BANK_TRANSFER','UPI','CHEQUE','CARD','OTHER')),
        reference_no TEXT,
        gateway_payment_id TEXT,
        raw_response TEXT,
        note TEXT,
        status TEXT DEFAULT 'SUCCESS' CHECK(status IN ('SUCCESS','REFUNDED','FAILED','PENDING')),
        date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
        FOREIGN KEY(party_id) REFERENCES parties(id) ON DELETE SET NULL
      );
    `);

    // =================================================
    // 🔁 SYNC QUEUE
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT,
        status TEXT DEFAULT 'PENDING',
        retry_count INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    // =================================================
    // 🔁 UPDATED_AT TRIGGERS
    // =================================================
    const triggerTables = [
      "companies",
      "parties",
      "party_addresses",
      "categories",
      "products",
      "tax_rates",
      "items",
      "carts",
      "cart_items",
      "invoices",
      "invoice_items",
      "payments",
      "sync_queue",
    ];

    triggerTables.forEach((table) => {
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_${table}_updated
        AFTER UPDATE ON ${table}
        BEGIN
          UPDATE ${table}
          SET updated_at = strftime('%s','now')
          WHERE id = NEW.id;
        END;
      `);
    });

    db.exec("COMMIT;");
    await persistDb();

    console.log("🎉 Migration completed successfully!");
  } catch (err: any) {
    db.exec("ROLLBACK;");
    console.error("❌ Migration failed:", err?.message ?? err);
    throw err;
  }
}
