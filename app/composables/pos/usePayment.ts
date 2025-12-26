import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { payments, invoices, invoice_items } from "@/db/schema";
import { dbReady } from "@/db/client";
import { enqueueSync } from "@/sync/queue";

const now = () => new Date().toISOString();

export function usePayment() {

  /* ================= CREATE PAYMENT ================= */

  const createPayment = async (data: {
    company_id: string;
    invoice_id?: string;      // null = ADVANCE
    customer_id?: string;
    amount: number;
    method: "CASH" | "CARD" | "UPI" | "BANK";
    reference?: string;
    type: "ADVANCE" | "PARTIAL" | "FULL";
  }) => {
    const { drizzleDb, persistDb } = await dbReady();
    const id = uuidv4();

    await drizzleDb.insert(payments).values({
      id,
      ...data,
      date: now(),
      created_at: now(),
      updated_at: now(),
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

  /* ================= ADVANCE PAYMENTS ================= */

  const getCustomerAdvanceBalance = async (customer_id: string) => {
    const { drizzleDb } = await dbReady();

    const rows = await drizzleDb
      .select()
      .from(payments)
      .where(
        eq(payments.customer_id, customer_id)
      );

    return rows
      .filter(p => p.type === "ADVANCE")
      .reduce((s, p) => s + p.amount, 0);
  };

  /* ================= FETCH ================= */

  const getInvoicePayments = async (invoice_id: string) => {
    const { drizzleDb } = await dbReady();

    return drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.invoice_id, invoice_id));
  };

  const getCompanyPayments = async (company_id: string) => {
    const { drizzleDb } = await dbReady();

    return drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.company_id, company_id));
  };

  return {
    createPayment,
    applyPaymentToInvoice,
    getInvoicePayments,
    getCompanyPayments,
    getCustomerAdvanceBalance,
  };
}


// createPayment({
//   company_id,
//   invoice_id,
//   amount: invoice.total_amount,
//   method: "UPI",
//   type: "FULL"
// });

// createPayment({
//   company_id,
//   invoice_id,
//   amount: 500,
//   method: "CASH",
//   type: "PARTIAL"
// });

// createPayment({
//   company_id,
//   customer_id,
//   amount: 1000,
//   method: "CASH",
//   type: "ADVANCE"
// });