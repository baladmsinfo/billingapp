import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { tax_rates } from "@/db/schema";
import { useDb } from "@/db/client";

const now = () => Date.now();

export const useTaxRates = () => {
    /* ===============================
       CREATE TAX RATE
    =============================== */
    const createTaxRate = async (data) => {
        const { drizzleDb, persistDb } = await useDb();

        await drizzleDb.insert(tax_rates).values({
            id: uuidv4(),
            ...data,
            created_at: now(),
            updated_at: now(),
        });

        await persistDb();
    };

    /* ===============================
       FETCH ALL TAX RATES BY COMPANY
    =============================== */
    const fetchTaxRates = async (company_id: string) => {
        const { drizzleDb } = await useDb();
        return drizzleDb
            .select()
            .from(tax_rates)
            .where(eq(tax_rates.company_id, company_id));
    };

    const updateTaxRate = async (data) => {
        const { drizzleDb, persistDb } = await useDb();

        await drizzleDb
            .update(tax_rates)
            .set({
                name: data.name,
                percentage: Number(data.percentage),
                updated_at: now(),
            })
            .where(eq(tax_rates.id, String(data.id))); // 🔥 FIX: Force string comparison

        await persistDb();
    };


    /* ===============================
       DELETE TAX RATE
    =============================== */
    const deleteTaxRate = async (id: string) => {
        const { drizzleDb, persistDb } = await useDb();

        await drizzleDb
            .delete(tax_rates)
            .where(eq(tax_rates.id, id));

        await persistDb();
    };

    return {
        createTaxRate,
        fetchTaxRates,
        updateTaxRate,
        deleteTaxRate,
    };
};
