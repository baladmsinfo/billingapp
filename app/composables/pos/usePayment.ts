import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { payments, invoices, parties, invoice_items } from "@/db/schema";
import { useDb } from "@/db/client.js";
import { enqueueSync } from "@/composables/pos/useSyncQueue";

const now = () => Date.now(); // ✅ INTEGER timestamp

export function usePayment() {

  /* ================= DB ================= */

  const dbReady = async () => {
    const { drizzleDb, persistDb } = await useDb();
    return { drizzleDb, persistDb };
  };

  /* ================= CREATE PAYMENT ================= */

  const createPayment = async (data: {
    company_id: string;
    invoice_id?: string;        // undefined = ADVANCE
    customer_id?: string;
    amount: number;
    method:
    | "CASH"
    | "CARD"
    | "UPI"
    | "BANK_TRANSFER"
    | "CHEQUE"
    | "OTHER";
    reference?: string;
    type: "ADVANCE" | "PARTIAL" | "FULL";
  }) => {

    // ✅ Guard: advance must not have invoice
    if (data.type === "ADVANCE" && data.invoice_id) {
      throw new Error("Advance payment cannot be linked to invoice");
    }

    const { drizzleDb, persistDb } = await dbReady();
    const id = uuidv4();
    const ts = now();

    await drizzleDb.insert(payments).values({
      id,
      company_id: data.company_id,
      invoice_id: data.invoice_id ?? null,
      customer_id: data.customer_id ?? null,
      amount: data.amount,
      method: data.method,
      reference_no: data.reference ?? null,
      type: data.type,
      date: ts,
      created_at: ts,
      updated_at: ts,
    });

    if (data.invoice_id) {
      await applyPaymentToInvoice(data.invoice_id, data.amount);
    }

    await enqueueSync({
      entity: "payments",
      entity_id: id,
      action: "CREATE",
      payload: data,
    });

    await persistDb();
    return id;
  };

  /* ================= APPLY PAYMENT ================= */

  const applyPaymentToInvoice = async (
    invoice_id: string,
    paid_amount: number
  ) => {
    const { drizzleDb } = await dbReady();

    const [invoice] = await drizzleDb
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoice_id))
      .limit(1);

    if (!invoice) throw new Error("Invoice not found");

    let remaining = paid_amount;

    const items = await drizzleDb
      .select()
      .from(invoice_items)
      .where(eq(invoice_items.invoice_id, invoice_id));

    for (const item of items) {
      if (remaining <= 0) break;

      const due = item.total - item.paid_amount;
      if (due <= 0) continue;

      const pay = Math.min(due, remaining);

      await drizzleDb
        .update(invoice_items)
        .set({
          paid_amount: item.paid_amount + pay,
          status:
            item.paid_amount + pay >= item.total
              ? "PAID"
              : "PARTIALLY_PAID",
          updated_at: now(),
        })
        .where(eq(invoice_items.id, item.id));

      remaining -= pay;
    }

    await recalcInvoiceStatus(invoice_id);
  };

  /* ================= INVOICE STATUS ================= */

  const recalcInvoiceStatus = async (invoice_id: string) => {
    const { drizzleDb } = await dbReady();

    const items = await drizzleDb
      .select()
      .from(invoice_items)
      .where(eq(invoice_items.invoice_id, invoice_id));

    const total = items.reduce((s, i) => s + i.total, 0);
    const paid = items.reduce((s, i) => s + i.paid_amount, 0);

    let status: "PENDING" | "PARTIALLY_PAID" | "PAID" = "PENDING";

    if (paid >= total) status = "PAID";
    else if (paid > 0) status = "PARTIALLY_PAID";

    await drizzleDb
      .update(invoices)
      .set({
        status,
        paid_amount: paid,
        balance_amount: total - paid,
        updated_at: now(),
      })
      .where(eq(invoices.id, invoice_id));
  };

  /* ================= ADVANCE BALANCE ================= */

  const getCustomerAdvanceBalance = async (customer_id: string) => {
    const { drizzleDb } = await dbReady();

    const rows = await drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.customer_id, customer_id));

    return rows
      .filter(p => p.type === "ADVANCE")
      .reduce((s, p) => s + p.amount, 0);
  };

  /* ================= FETCH ================= */

  const getCompanyPayments = async (company_id: string) => {
    const { drizzleDb } = await dbReady();

    return drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.company_id, company_id))
      .orderBy(desc(payments.date));
  };


  const listPaymentsByCompany = async ({ company_id }) => {
    const { drizzleDb, persistDb } = await useDb();
    return await drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.company_id, company_id))
      .orderBy(desc(payments.date))
  }

  const getInvoicePayments = async (invoice_id: string) => {
    const { drizzleDb, persistDb } = await useDb();
    return await drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.invoice_id, invoice_id))
      .orderBy(desc(payments.date))
  }

  const getPaymentById = async (id: string) => {
    const { drizzleDb } = await dbReady();

    // Get payment
    const [payment] = await drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    if (!payment) return null;

    // Fetch linked invoice (if exists)
    let invoice = null;
    if (payment.invoice_id) {
      const [inv] = await drizzleDb
        .select()
        .from(invoices)
        .where(eq(invoices.id, payment.invoice_id))
        .limit(1);
      invoice = inv || null;
    }

    // Fetch party (customer)
    let party = null;
    if (payment.party_id) {
      const [p] = await drizzleDb
        .select()
        .from(parties)
        .where(eq(parties.id, payment.party_id))
        .limit(1);
      party = p || null;
    }

    return { payment, invoice, party };
  };

  const getCustomerPayments = async (customer_id: string) => {
    const { drizzleDb } = await dbReady();

    return drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.customer_id, customer_id))
      .orderBy(desc(payments.date));
  };

  return {
    createPayment,
    applyPaymentToInvoice,
    getInvoicePayments,
    getCompanyPayments,
    getCustomerPayments,
    getCustomerAdvanceBalance,
    getPaymentById,
    listPaymentsByCompany
  };
}
