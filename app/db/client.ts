// db/client.ts
import initSqlJs, { SqlJsStatic, Database } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import { Filesystem, Directory } from "@capacitor/filesystem";

let db: Database | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;
let SQL: SqlJsStatic;

const DB_FILE = "billing.db";

// -------------------------------
// Helper: convert ArrayBuffer to Base64
// -------------------------------
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// -------------------------------
// Persist DB to filesystem
// -------------------------------
export async function persistDb(): Promise<void> {
  if (!db) return;

  const binaryArray = db.export(); // Uint8Array
  const blob = new Blob([binaryArray], { type: "application/octet-stream" });
  const buffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);

  await Filesystem.writeFile({
    path: DB_FILE,
    data: base64,
    directory: Directory.Data,
  });
}

// -------------------------------
// Load DB from filesystem
// -------------------------------
async function loadDb(SQL: SqlJsStatic): Promise<Database> {
  try {
    const file = await Filesystem.readFile({
      path: DB_FILE,
      directory: Directory.Data,
    });

    const binary = atob(file.data);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);

    return new SQL.Database(buffer); // Load saved DB
  } catch (err: any) {
    console.log("ℹ️ No existing DB, creating new one:", err.message);
    return new SQL.Database(); // Fresh DB
  }
}

// -------------------------------
// Main Hook: useDb
// -------------------------------
export async function useDb(): Promise<{
  db: Database;
  drizzleDb: ReturnType<typeof drizzle>;
  persistDb: () => Promise<void>;
}> {
  if (drizzleDb && db) return { db, drizzleDb, persistDb };

  SQL = await initSqlJs({ locateFile: () => `/sql-wasm.wasm` });
  db = await loadDb(SQL);
  drizzleDb = drizzle(db);

  return { db, drizzleDb, persistDb };
}
