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
    // 🏢 COMPANIES (SINGLE COMPANY – OFFLINE POS)
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
    // 👥 CUSTOMERS
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        gstin TEXT,
        password TEXT,
        company_id TEXT NOT NULL,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
    `);

    // =================================================
    // 📍 CUSTOMER ADDRESSES
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS customer_addresses (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        address_line1 TEXT,
        address_line2 TEXT,
        address_line3 TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        pincode TEXT,
        is_default INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
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
    // 📦 ITEMS (VARIANTS / STOCK)
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        sku TEXT,
        variant TEXT,
        price REAL,
        mrp REAL,
        quantity INTEGER DEFAULT 0,
        location TEXT,
        tax_rate_id TEXT,
        company_id TEXT NOT NULL,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
    `);

    // =================================================
    // 🧑‍💼 VENDORS
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS vendors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        gstin TEXT,
        company_id TEXT NOT NULL,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
    `);

    // =================================================
    // 🛒 CARTS
    // =================================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS carts (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        company_id TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING'
          CHECK(status IN ('DRAFT','HOLD','PENDING','ACTIVE','CHECKEDOUT','CANCELLED')),
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
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
        customer_id TEXT,
        vendor_id TEXT,
        date INTEGER,
        due_date INTEGER,
        status TEXT DEFAULT 'PENDING'
          CHECK(status IN ('PENDING','PARTIAL','PAYLATER','PAID','CANCELLED')),
        type TEXT DEFAULT 'SALE'
          CHECK(type IN ('SALE','POS','EXPENSE','ONLINE','PURCHASE','RETURN','OTHER')),
        total_amount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY(vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
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
        status TEXT DEFAULT 'ORDERED'
          CHECK(status IN ('ORDERED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','RETURNED')),
        tax_rate_id TEXT,
        total REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER,
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
        amount REAL DEFAULT 0,
        method TEXT DEFAULT 'CASH'
          CHECK(method IN ('CASH','BANK_TRANSFER','UPI','CHEQUE','CARD','OTHER')),
        gateway_payment_id TEXT,
        raw_response TEXT,
        reference_no TEXT,
        date INTEGER,
        note TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
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
      "customers",
      "customer_addresses",
      "categories",
      "products",
      "items",
      "vendors",
      "carts",
      "cart_items",
      "invoices",
      "invoice_items",
      "payments",
      "sync_queue", // added sync_queue here
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

    console.log(
      reset
        ? "🎉 Database reset & migration completed!"
        : "🎉 Migration completed successfully!"
    );
  } catch (err: any) {
    db.exec("ROLLBACK;");
    console.error("❌ Migration failed:", err?.message ?? err);
    throw err;
  }
}
