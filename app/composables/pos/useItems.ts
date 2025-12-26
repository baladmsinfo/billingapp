import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { items } from "@/db/schema";
import { useDb } from "@/db/client";

const now = () => Date.now();

export const useItems = () => {
  /* ===== CREATE VARIANT / STOCK ===== */
  const createItem = async (data) => {
    const { drizzleDb, persistDb } = await useDb();

    await drizzleDb.insert(items).values({
      id: uuidv4(),
      ...data,
      created_at: now(),
      updated_at: now(),
    });

    await persistDb();
  };

  /* ===== LIST ITEMS BY PRODUCT ===== */
  const listItemsByProduct = async (product_id: string) => {
    const { drizzleDb } = await useDb();
    return drizzleDb
      .select()
      .from(items)
      .where(eq(items.product_id, product_id));
  };

  /* ===== UPDATE STOCK ===== */
  const updateStock = async (id: string, quantity: number) => {
    const { drizzleDb, persistDb } = await useDb();

    await drizzleDb
      .update(items)
      .set({ quantity, updated_at: now() })
      .where(eq(items.id, id));

    await persistDb();
  };

  return { createItem, listItemsByProduct, updateStock };
};
