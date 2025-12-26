import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { companies } from "@/db/schema";
import { dbReady } from "@/db/client";
import { enqueueSync } from "@/sync/queue";

const now = () => new Date().toISOString();

export function useCompany() {

  /* ================= COMPANY ================= */

  const createCompany = async (data: {
    name: string;
    legal_name?: string;
    gst_number?: string;
    phone?: string;
    email?: string;
    address?: string;
  }) => {
    const { drizzleDb, persistDb } = await dbReady();
    const id = uuidv4();

    await drizzleDb.insert(companies).values({
      id,
      ...data,
      created_at: now(),
      updated_at: now(),
    });

    await enqueueSync({
      entity: "companies",
      entity_id: id,
      action: "CREATE",
      payload: data,
    });

    await persistDb();
    return id;
  };

  const updateCompany = async (company_id: string, updates: any) => {
    const { drizzleDb, persistDb } = await dbReady();

    await drizzleDb
      .update(companies)
      .set({
        ...updates,
        updated_at: now(),
      })
      .where(eq(companies.id, company_id));

    await enqueueSync({
      entity: "companies",
      entity_id: company_id,
      action: "UPDATE",
      payload: updates,
    });

    await persistDb();
  };

  const getCompanyById = async (company_id: string) => {
    const { drizzleDb } = await dbReady();

    const [company] = await drizzleDb
      .select()
      .from(companies)
      .where(eq(companies.id, company_id))
      .limit(1);

    return company || null;
  };

  const getCompanies = async () => {
    const { drizzleDb } = await dbReady();
    return drizzleDb.select().from(companies);
  };

  const deleteCompany = async (company_id: string) => {
    const { drizzleDb, persistDb } = await dbReady();

    await drizzleDb.delete(companies).where(eq(companies.id, company_id));

    await enqueueSync({
      entity: "companies",
      entity_id: company_id,
      action: "DELETE",
      payload: {},
    });

    await persistDb();
  };

  return {
    createCompany,
    updateCompany,
    getCompanyById,
    getCompanies,
    deleteCompany,
  };
}
