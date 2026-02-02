<<<<<<< HEAD
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
=======
// composables/pos/useDashboard.ts
import { ref } from "vue";
import { useDb } from "@/db/client.js";
import { DEFAULT_COMPANY_ID } from "@/constants/company";

// -------------------- HELPERS --------------------
const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000); // seconds
};

const yearStart = () => {
  const d = new Date();
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000); // seconds
};

// -------------------- USE DASHBOARD --------------------
export function useDashboard() {
  const loading = ref(false);

  /* ================= CORE ================= */
  const stats = ref<any[]>([]);
  const transactions = ref<any[]>([]);
  const recentOrders = ref<any[]>([]);

  /* ================= ADVANCED ================= */
  const paidVsPending = ref({ paid: 0, pending: 0 });
  const invoiceAging = ref<any[]>([]);
  const topCustomers = ref<any[]>([]);
  const topVendors = ref<any[]>([]);
  const hourlySales = ref<any[]>([]);

  const loadDashboard = async () => {
    loading.value = true;
    const { db } = await useDb();
    const companyId = DEFAULT_COMPANY_ID;
    const today = todayStart();
    const year = yearStart();
    const nowSec = Math.floor(Date.now() / 1000);

    // -------------------- SALES --------------------
    const todaySales =
      db.exec(
        `
      SELECT COALESCE(SUM(total_amount),0)
      FROM invoices
      WHERE company_id = ? AND type IN ('SALE','POS') AND status != 'CANCELLED' AND created_at >= ?
    `,
        [companyId, today]
      )[0]?.values?.[0]?.[0] ?? 0;

    const yearSales =
      db.exec(
        `
      SELECT COALESCE(SUM(total_amount),0)
      FROM invoices
      WHERE company_id = ? AND type IN ('SALE','POS') AND status != 'CANCELLED' AND created_at >= ?
    `,
        [companyId, year]
      )[0]?.values?.[0]?.[0] ?? 0;

    // -------------------- PAYMENTS --------------------
    const sumByMethod = (method: string) =>
      db.exec(
        `
      SELECT COALESCE(SUM(amount),0)
      FROM payments
      WHERE company_id = ? AND method = ? AND date >= ?
    `,
        [companyId, method, today]
      )[0]?.values?.[0]?.[0] ?? 0;

    const cash = sumByMethod("CASH");
    const upi = sumByMethod("UPI");
    const card = sumByMethod("CARD");

    // -------------------- GST / EXPENSE --------------------
    const gst =
      db.exec(
        `
      SELECT COALESCE(SUM(tax_amount),0)
      FROM invoices
      WHERE company_id = ? AND type IN ('SALE','POS') AND created_at >= ?
    `,
        [companyId, today]
      )[0]?.values?.[0]?.[0] ?? 0;

    const expenses =
      db.exec(
        `
      SELECT COALESCE(SUM(total_amount),0)
      FROM invoices
      WHERE company_id = ? AND type = 'EXPENSE' AND created_at >= ?
    `,
        [companyId, today]
      )[0]?.values?.[0]?.[0] ?? 0;

    // -------------------- PAID vs PENDING --------------------
    const paid =
      db.exec(
        `
      SELECT COALESCE(SUM(total_amount),0)
      FROM invoices
      WHERE company_id = ? AND status = 'PAID'
    `,
        [companyId]
      )[0]?.values?.[0]?.[0] ?? 0;

    const pending =
      db.exec(
        `
      SELECT COALESCE(SUM(total_amount),0)
      FROM invoices
      WHERE company_id = ? AND status IN ('PENDING','PARTIAL','PAYLATER')
    `,
        [companyId]
      )[0]?.values?.[0]?.[0] ?? 0;

    paidVsPending.value = { paid, pending };

    // -------------------- INVOICE AGING --------------------
    invoiceAging.value = [
      {
        label: "0–30 Days",
        amount:
          db.exec(
            `
          SELECT COALESCE(SUM(total_amount),0)
          FROM invoices
          WHERE company_id = ? AND status != 'PAID' AND (? - created_at) <= 2592000
        `,
            [companyId, nowSec]
          )[0]?.values?.[0]?.[0] ?? 0,
      },
      {
        label: "31–60 Days",
        amount:
          db.exec(
            `
          SELECT COALESCE(SUM(total_amount),0)
          FROM invoices
          WHERE company_id = ? AND status != 'PAID' AND (? - created_at) BETWEEN 2592001 AND 5184000
        `,
            [companyId, nowSec]
          )[0]?.values?.[0]?.[0] ?? 0,
      },
      {
        label: "60+ Days",
        amount:
          db.exec(
            `
          SELECT COALESCE(SUM(total_amount),0)
          FROM invoices
          WHERE company_id = ? AND status != 'PAID' AND (? - created_at) > 5184000
        `,
            [companyId, nowSec]
          )[0]?.values?.[0]?.[0] ?? 0,
      },
    ];

    // -------------------- TOP CUSTOMERS --------------------
    const customerRows =
      db.exec(
        `
      SELECT COALESCE(p.name,'Walk-in') AS name, SUM(i.total_amount) AS total
      FROM invoices i
      LEFT JOIN parties p ON p.id = i.party_id AND p.type IN ('CUSTOMER','BOTH')
      WHERE i.company_id = ? AND i.type IN ('SALE','POS') AND i.created_at >= ?
      GROUP BY i.party_id
      ORDER BY total DESC
      LIMIT 5
    `,
        [companyId, today]
      )[0]?.values ?? [];

    topCustomers.value = customerRows.map((r) => ({
      name: r[0],
      amount: r[1],
    }));

    // -------------------- TOP VENDORS --------------------
    // Currently empty, requires vendor tracking on invoices/items
    topVendors.value = [];

    // -------------------- HOURLY SALES --------------------
    const hourRows =
      db.exec(
        `
      SELECT strftime('%H', created_at, 'unixepoch') AS hour, SUM(total_amount)
      FROM invoices
      WHERE company_id = ? AND type IN ('SALE','POS') AND created_at >= ?
      GROUP BY hour
      ORDER BY hour
    `,
        [companyId, today]
      )[0]?.values ?? [];

    hourlySales.value = hourRows.map((r) => ({
      hour: `${r[0]}:00`,
      amount: r[1],
    }));

    // -------------------- RECENT ORDERS --------------------
    const orderRows =
      db.exec(
        `
      SELECT i.id, i.invoice_number, COALESCE(p.name,'Walk-in'), i.total_amount, i.status, i.created_at
      FROM invoices i
      LEFT JOIN parties p ON p.id = i.party_id
      WHERE i.company_id = ? AND i.type IN ('SALE','POS')
      ORDER BY i.created_at DESC
      LIMIT 5
    `,
        [companyId]
      )[0]?.values ?? [];

    recentOrders.value = orderRows.map((r) => ({
      id: r[0],
      invoice_number: r[1],
      customer: r[2],
      amount: r[3],
      status: r[4],
      payment_status:
        r[4] === "PAID" ? "Paid" : r[4] === "PARTIAL" ? "Partial" : "Pending",
      created_at: r[5],
    }));

    // -------------------- STATS CARDS --------------------
    const money = (v: number) => `₹ ${Number(v).toLocaleString()}`;
    stats.value = [
      { title: "Today Sales", value: money(todaySales), icon: "mdi-trending-up", bg: "bg-green" },
      { title: "Year Sales", value: money(yearSales), icon: "mdi-calendar", bg: "bg-teal" },
      { title: "Cash", value: money(cash), icon: "mdi-cash", bg: "bg-orange" },
      { title: "UPI", value: money(upi), icon: "mdi-qrcode-scan", bg: "bg-purple" },
      { title: "Card", value: money(card), icon: "mdi-credit-card", bg: "bg-indigo" },
      { title: "GST Collected", value: money(gst), icon: "mdi-percent", bg: "bg-cyan" },
      { title: "Expenses", value: money(expenses), icon: "mdi-receipt", bg: "bg-red" },
    ];

    loading.value = false;
  };

  return {
    stats,
    transactions,
    recentOrders,
    paidVsPending,
    invoiceAging,
    topCustomers,
    topVendors,
    hourlySales,
    loading,
    loadDashboard,
  };
}
>>>>>>> 0e5e5758d7317fc989fe6c4df26ddf0886de4e90
