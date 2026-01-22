import { useDb } from "@/db/client"
import { invoice_items, categories } from "@/db/schema"
import { and, eq, gte, lte } from "drizzle-orm"
import { getDateRange } from "@/utils/dateRange"

export function useExpense(companyId: string) {
  const dbPromise = useDb()

  const getDb = async () => {
    const { drizzleDb } = await dbPromise
    return drizzleDb
  }

  const getExpenseChart = async (period = "thisYear") => {
    const drizzleDb = await getDb()
    const { start, end } = getDateRange(period)

    const rows = await drizzleDb
      .select({
        category: categories.name,
        total: invoice_items.total,
      })
      .from(invoice_items)
      .leftJoin(
        categories,
        eq(invoice_items.category_id, categories.id)
      )
      .where(
        and(
          eq(invoice_items.company_id, companyId),
          eq(invoice_items.status, "ORDERED"),
          gte(invoice_items.created_at, start),
          lte(invoice_items.created_at, end)
        )
      )

    const grouped: Record<string, number> = {}

    for (const r of rows) {
      const key = r.category ?? "Other"
      grouped[key] = (grouped[key] || 0) + r.total
    }

    const items = Object.entries(grouped).map(([category, total]) => ({
      category,
      total,
    }))

    return {
      items,
      total: items.reduce((s, i) => s + i.total, 0),
    }
  }

  return { getExpenseChart }
}