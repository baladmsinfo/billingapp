import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { products, items } from "@/db/schema";
import { useDb } from "@/db/client";

const now = () => Math.floor(Date.now() / 1000);

export const useProducts = () => {
  /* ================= CREATE PRODUCT WITH ITEMS ================= */

  const createProduct = async (
    product: {
      name: string;
      sku?: string;
      price: number;
      mrp?: number;
      category_id?: string | null;
      sub_category_id?: string | null;
      company_id: string;
    },
    variants: Array<{
      sku?: string;
      variant?: string;
      price?: number;
      mrp?: number;
      quantity?: number;
      location?: string;
      tax_rate_id?: string;
    }> = []
  ) => {
    const { drizzleDb, persistDb } = await useDb();
    const productId = uuidv4();

    await drizzleDb.insert(products).values({
      id: productId,
      ...product,
      created_at: now(),
      updated_at: now(),
    });

    if (variants.length) {
      await drizzleDb.insert(items).values(
        variants.map((v) => ({
          id: uuidv4(),
          product_id: productId,
          sku: v.sku,
          variant: v.variant,
          price: v.price ?? product.price,
          mrp: v.mrp ?? product.mrp,
          quantity: v.quantity ?? 0,
          location: v.location,
          tax_rate_id: v.tax_rate_id,
          company_id: product.company_id,
          created_at: now(),
          updated_at: now(),
        }))
      );
    }

    await persistDb();
    return productId;
  };

  /* ================= LIST PRODUCTS WITH ITEMS ================= */
  const listProducts = async (filter: { company_id: string }) => {
    const { drizzleDb } = await useDb();

    // Fetch products with latest first
    const prods = await drizzleDb
      .select()
      .from(products)
      .where(eq(products.company_id, filter.company_id))
      .orderBy(products.updated_at, "desc");

    const allItems = await drizzleDb
      .select()
      .from(items)
      .where(eq(items.company_id, filter.company_id));

    return prods.map((p) => ({
      ...p,
      items: allItems.filter((i) => i.product_id === p.id),
      stock: allItems
        .filter((i) => i.product_id === p.id)
        .reduce((s, i) => s + (i.quantity ?? 0), 0),
    }));
  };

  /* ================= UPDATE PRODUCT ================= */

  const updateProduct = async (
    id: string,
    updates: Partial<typeof products.$inferInsert>
  ) => {
    const { drizzleDb, persistDb } = await useDb();

    await drizzleDb
      .update(products)
      .set({ ...updates, updated_at: now() })
      .where(eq(products.id, id));

    await persistDb();
  };

  /* ================= DELETE PRODUCT ================= */

  const deleteProduct = async (id: string) => {
    const { drizzleDb, persistDb } = await useDb();

    await drizzleDb.delete(items).where(eq(items.product_id, id));
    await drizzleDb.delete(products).where(eq(products.id, id));

    await persistDb();
  };

  return {
    createProduct,
    listProducts,
    updateProduct,
    deleteProduct,
  };
};
