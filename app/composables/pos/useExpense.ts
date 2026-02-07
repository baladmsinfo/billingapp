import { useDb } from "@/db/client"
import { invoice_items, invoices,
  products, categories } from "@/db/schema"
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
      .leftJoin(invoices, eq(invoice_items.invoice_id, invoices.id))          // join invoices
      .leftJoin(products, eq(invoice_items.product_id, products.id))          // join products
      .leftJoin(categories, eq(products.category_id, categories.id))          // join categories
      .where(
        and(
          eq(invoices.company_id, companyId), // FIX — correct company filter
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