import { useDb } from "@/db/client"
import { invoices, payments } from "@/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import { getDateRange } from "@/utils/dateRange"

export function useDashboard(companyId: string) {
  // DO NOT await here
  const dbPromise = useDb()

  const getDb = async () => {
    const { drizzleDb } = await dbPromise
    return drizzleDb
  }

  /* ================= SALES ================= */
  const getSalesSummary = async (period = "thisYear") => {
    const drizzleDb = await getDb()
    const { start, end } = getDateRange(period)

    const invs = await drizzleDb
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.company_id, companyId),
          eq(invoices.type, "SALE"),
          gte(invoices.date, start),
          lte(invoices.date, end)
        )
      )

    if (!invs.length) return { paid: 0, unpaid: 0 }

    const pays = await drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.company_id, companyId))

    let paid = 0
    let unpaid = 0

    for (const inv of invs) {
      const paidAmount = pays
        .filter(p => p.invoice_id === inv.id)
        .reduce((s, p) => s + p.amount, 0)

      if (paidAmount >= inv.total_amount) {
        paid += inv.total_amount
      } else {
        unpaid += inv.total_amount - paidAmount
      }
    }

    return { paid, unpaid }
  }

  /* ================= PURCHASES ================= */
  const getPurchaseSummary = async (period = "thisYear") => {
    const drizzleDb = await getDb()
    const { start, end } = getDateRange(period)

    const invs = await drizzleDb
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.company_id, companyId),
          eq(invoices.type, "PURCHASE"),
          gte(invoices.date, start),
          lte(invoices.date, end)
        )
      )

    if (!invs.length) return { paid: 0, unpaid: 0 }

    const pays = await drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.company_id, companyId))

    let paid = 0
    let unpaid = 0

    for (const inv of invs) {
      const paidAmount = pays
        .filter(p => p.invoice_id === inv.id)
        .reduce((s, p) => s + p.amount, 0)

      if (paidAmount >= inv.total_amount) {
        paid += inv.total_amount
      } else {
        unpaid += inv.total_amount - paidAmount
      }
    }

    return { paid, unpaid }
  }

  /* ================= CASHFLOW ================= */
  const getCashflow = async (period = "thisYear") => {
    const drizzleDb = await getDb()
    const { start, end } = getDateRange(period)

    const rows = await drizzleDb
      .select({
        amount: payments.amount,
        date: payments.date,
        type: invoices.type,
      })
      .from(payments)
      .leftJoin(invoices, eq(payments.invoice_id, invoices.id))
      .where(
        and(
          eq(payments.company_id, companyId),
          gte(payments.date, start),
          lte(payments.date, end)
        )
      )

    const grouped: Record<string, { inflow: number; outflow: number }> = {}

    for (const r of rows) {
      if (!r.date) continue
      const day = new Date(r.date).toISOString().slice(0, 10)
      grouped[day] ??= { inflow: 0, outflow: 0 }

      if (r.type === "SALE") grouped[day].inflow += r.amount
      if (r.type === "PURCHASE") grouped[day].outflow += r.amount
    }

    return {
      labels: Object.keys(grouped),
      inflow: Object.values(grouped).map(v => v.inflow),
      outflow: Object.values(grouped).map(v => v.outflow),
    }
  }

  /* ================= PROFIT & LOSS ================= */
  const getProfitLoss = async (period = "thisYear") => {
    const drizzleDb = await getDb()
    const { start, end } = getDateRange(period)

    const rows = await drizzleDb
      .select({
        date: invoices.date,
        type: invoices.type,
        total: invoices.total_amount,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.company_id, companyId),
          gte(invoices.date, start),
          lte(invoices.date, end)
        )
      )

    const grouped: Record<string, { sales: number; purchases: number }> = {}

    for (const r of rows) {
      if (!r.date) continue
      const day = new Date(r.date).toISOString().slice(0, 10)
      grouped[day] ??= { sales: 0, purchases: 0 }

      if (r.type === "SALE") grouped[day].sales += r.total
      if (r.type === "PURCHASE") grouped[day].purchases += r.total
    }

    return {
      labels: Object.keys(grouped),
      values: Object.values(grouped).map(v => v.sales - v.purchases),
    }
  }

  return {
    getSalesSummary,
    getPurchaseSummary,
    getCashflow,
    getProfitLoss,
  }
}