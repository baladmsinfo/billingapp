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
