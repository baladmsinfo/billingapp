import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { products, categories, items, tax_rates} from "@/db/schema";
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

    const taxRatesList = await drizzleDb.select().from(tax_rates)
  .where(eq(tax_rates.company_id, filter.company_id));

const taxRateMap = Object.fromEntries(taxRatesList.map(t => [t.id, t.percentage]));

const taxratematch = (i)=> {
 

  const taxrate = taxRatesList.filter((t)=>{
     
    if (t.id == i.tax_rate_id) {
      return true;
      
    } else {
      return false;
    }
  })
return taxrate[0]?.percentage
}

console.log("productwithitems",prods.map((p) => ({
  ...p,
  items: allItems
    .filter((i) => i.product_id === p.id)
    .map((i) => ({
      ...i,
      tax_rate: taxratematch(i)
    })),
  stock: allItems
    .filter((i) => i.product_id === p.id)
    .reduce((s, i) => s + (i.quantity ?? 0), 0),
})));


return prods.map((p) => ({
  ...p,
  items: allItems
    .filter((i) => i.product_id === p.id)
    .map((i) => ({
      ...i,
      tax_rate: taxratematch(i)
    })),
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

  /* ================= CREATE VARIANT ================= */
  const createVariant = async (productId: string, variant: any) => {
    const { drizzleDb, persistDb } = await useDb();

    const id = uuidv4();
    await drizzleDb.insert(items).values({
      id,
      product_id: productId,
      sku: variant.sku,
      variant: variant.variant,
      price: variant.price,
      mrp: variant.mrp,
      quantity: variant.quantity || 0,
      location: variant.location || " ",
      tax_rate_id: variant.tax_rate_id ?? null,
      company_id: variant.company_id,
      created_at: now(),
      updated_at: now(),
    });

    await persistDb();
    return id;
  };

  /* ================= UPDATE VARIANT ================= */
  const updateVariant = async (variantId: string, updates: any) => {
    const { drizzleDb, persistDb } = await useDb();

    await drizzleDb
      .update(items)
      .set({ ...updates, updated_at: now() })
      .where(eq(items.id, variantId));

    await persistDb();
  };

  /* ================= DELETE VARIANT ================= */
  const deleteVariants = async (variantId: string) => {
    const { drizzleDb, persistDb } = await useDb();

    await drizzleDb
      .delete(items)
      .where(eq(items.id, variantId));

    await persistDb();
  };

  // -----------------------------
  // FETCH ALL CATEGORIES
  // -----------------------------
  async function fetchCategories(company_id) {
    const { drizzleDb, persistDb } = await useDb();
    return await drizzleDb
      .select()
      .from(categories)
      .where(eq(categories.company_id, company_id));
    await persistDb();
  }


  // -----------------------------
  // CREATE CATEGORY
  // -----------------------------
  async function createCategory({ name, company_id, parent_id = null }) {
    const id = crypto.randomUUID();
    const { drizzleDb, persistDb } = await useDb();
    await drizzleDb.insert(categories).values({
      id,
      name,
      company_id,
      parent_id,
      created_at: Date.now(),
      updated_at: Date.now()
    });
    await persistDb();

    return id;
  }

  // -----------------------------
  // CREATE SUBCATEGORY
  // -----------------------------
  async function createSubCategory({ name, company_id, parent_id }) {
    const id = crypto.randomUUID();
   const { drizzleDb, persistDb } = await useDb();
    await drizzleDb.insert(categories).values({
      id,
      name,
      company_id,
      parent_id,
      created_at: Date.now(),
      updated_at: Date.now()
    });
    await persistDb();

    return id;
  }

  return {
    createProduct,
    listProducts,
    updateProduct,
    deleteProduct,
    createVariant,
    updateVariant,
    deleteVariants,
    fetchCategories,
    createCategory,
    createSubCategory,
  };
};

