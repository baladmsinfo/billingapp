import { categories } from "@/db/schema";
import { useDb  } from "@/db/client";
import { enqueueSync } from "./useSyncQueue";
import { v4 as uuidv4 } from "uuid";
import { eq, isNull, and } from "drizzle-orm";

const now = () => Math.floor(Date.now() / 1000);

export function useCategories() {

  /* ================= CREATE CATEGORY ================= */
  const createCategory = async (
    data: {
      name: string;
      description?: string;
      company_id: string;
    },
    parent_id: string | null = null
  ) => {
    const { drizzleDb, persistDb } = await useDb();
    const id = uuidv4();

    const row = {
      id,
      name: data.name,
      description: data.description ?? null,
      company_id: data.company_id,
      parent_id,
      created_at: now(),
      updated_at: now(),
    };

    await drizzleDb.insert(categories).values(row);

    await enqueueSync({
      entity: "categories",
      entity_id: id,
      action: "CREATE",
      payload: row,
    });

    await persistDb();
    return id;
  };

  /* ================= GET CATEGORIES ================= */
  const getCategories = async (params: {
    company_id: string
    parent_id?: string | null
  }) => {
    const { drizzleDb } = await useDb()

    const whereClause =
      params.parent_id === undefined
        ? eq(categories.company_id, params.company_id)
        : params.parent_id === null
        ? and(
            eq(categories.company_id, params.company_id),
            isNull(categories.parent_id)
          )
        : and(
            eq(categories.company_id, params.company_id),
            eq(categories.parent_id, params.parent_id)
          )

    return drizzleDb
      .select()
      .from(categories)
      .where(whereClause)
  }

  /* ================= CATEGORY TREE (POS / FILTER UI) ================= */
  const getCategoryTree = async (company_id: string) => {
    const { drizzleDb } = await useDb();
    const rows = await drizzleDb
      .select()
      .from(categories)
      .where(eq(categories.company_id, company_id));

    const map: Record<string, any> = {};
    const roots: any[] = [];

    rows.forEach(cat => {
      map[cat.id] = { ...cat, children: [] };
    });

    rows.forEach(cat => {
      if (cat.parent_id && map[cat.parent_id]) {
        map[cat.parent_id].children.push(map[cat.id]);
      } else {
        roots.push(map[cat.id]);
      }
    });

    return roots;
  };

  /* ================= UPDATE CATEGORY ================= */
  const updateCategory = async (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      parent_id: string | null;
    }>
  ) => {
    const { drizzleDb, persistDb } = await useDb();

    await drizzleDb
      .update(categories)
      .set({ ...data, updated_at: now() })
      .where(eq(categories.id, id));

    await enqueueSync({
      entity: "categories",
      entity_id: id,
      action: "UPDATE",
      payload: data,
    });

    await persistDb();
  };

  /* ================= DELETE CATEGORY ================= */
  const deleteCategory = async (id: string) => {
    const { drizzleDb, persistDb } = await useDb();

    await drizzleDb.delete(categories).where(eq(categories.id, id));

    await enqueueSync({
      entity: "categories",
      entity_id: id,
      action: "DELETE",
      payload: {},
    });

    await persistDb();
  };

  return {
    createCategory,
    getCategories,
    getCategoryTree,
    updateCategory,
    deleteCategory,
  };
}
