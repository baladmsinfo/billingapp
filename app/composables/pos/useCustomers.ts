// composables/pos/useCustomers.ts
import { ref } from "vue";
import { v4 as uuidv4 } from "uuid";
import { eq, desc, inArray } from "drizzle-orm";
import { parties, party_addresses, invoices, invoice_items, products, payments } from "@/db/schema";
import { useDb } from "@/db/client";

const now = () => Math.floor(Date.now() / 1000);

export const useCustomers = () => {
  const customers = ref([]);

  /* ===============================
   * FETCH CUSTOMERS + ADDRESSES
   * ===============================*/
  const fetchCustomers = async (company_id: string) => {
    const { drizzleDb } = await useDb();

    // 1. Fetch parties/customers
    const result = await drizzleDb
      .select()
      .from(parties)
      .where(eq(parties.company_id, company_id))
      .orderBy(desc(parties.updated_at));

    // 2. Get party IDs
    const partyIds = result.map((c) => c.id);

    if (partyIds.length === 0) {
      customers.value = [];
      return;
    }

    // 3. Fetch addresses for these IDs
    const addresses = await drizzleDb
      .select()
      .from(party_addresses)
      .where(inArray(party_addresses.party_id, partyIds));

    // 4. Merge
    customers.value = result.map((c) => ({
      ...c,
      addresses: addresses.filter((a) => a.party_id === c.id),
    }));
  };

  /* ===============================
   * CREATE CUSTOMER
   * ===============================*/
  const createCustomer = async (data: any) => {
    const { drizzleDb, persistDb } = await useDb();
    const id = uuidv4();

    await drizzleDb.insert(parties).values({
      id,
      company_id: data.company_id,
      type: "CUSTOMER",
      name: data.name,
      email: data.email,
      phone: data.phone,
      gstin: data.gstin,
      opening_balance: data.opening_balance ?? 0,
      credit_limit: data.credit_limit ?? 0,
      created_at: now(),
      updated_at: now(),
    });

    await persistDb();
    return id;
  };

  /* ===============================
   * UPDATE CUSTOMER
   * ===============================*/
  const updateCustomer = async (customer: any) => {
    const { drizzleDb, persistDb } = await useDb();

    await drizzleDb
      .update(parties)
      .set({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        updated_at: now(),
      })
      .where(eq(parties.id, customer.id));

    await persistDb();
  };

  /* ===============================
   * DELETE CUSTOMER
   * ===============================*/
  const deleteCustomer = async (id: string) => {
    const { drizzleDb, persistDb } = await useDb();

    await drizzleDb.delete(party_addresses).where(eq(party_addresses.party_id, id));
    await drizzleDb.delete(parties).where(eq(parties.id, id));

    await persistDb();
  };

  /* ===============================
 * GET CUSTOMER BY ID (FULL DETAILS)
 * ===============================*/
  const getCustomerById = async (id: string) => {
    const { drizzleDb } = await useDb();

    // 1. Fetch Customer
    const result = await drizzleDb
      .select()
      .from(parties)
      .where(eq(parties.id, id));

    if (result.length === 0) return null;

    const customer = result[0];

    // 2. Fetch Addresses
    const addresses = await drizzleDb
      .select()
      .from(party_addresses)
      .where(eq(party_addresses.party_id, id));

    // 3. Fetch Invoices
    const invoicesData = await drizzleDb
      .select()
      .from(invoices)
      .where(eq(invoices.party_id, id))
      .orderBy(desc(invoices.date));

    const invoiceIds = invoicesData.map((inv) => inv.id);

    let invoiceItems: any[] = [];
    let paymentsForInvoices: any[] = [];
    let productsMap: Record<string, any> = {};

    if (invoiceIds.length > 0) {
      // 4. Fetch invoice items
      invoiceItems = await drizzleDb
        .select()
        .from(invoice_items)
        .where(inArray(invoice_items.invoice_id, invoiceIds));

      // Extract product IDs
      const productIds = Array.from(
        new Set(invoiceItems.map((i) => i.product_id))
      );

      // 5. Fetch product details
      if (productIds.length > 0) {
        const productRows = await drizzleDb
          .select()
          .from(products)
          .where(inArray(products.id, productIds));

        // Map: { productId → productObject }
        productRows.forEach((p) => {
          productsMap[p.id] = p;
        });
      }

      // 6. Fetch payments for invoices
      paymentsForInvoices = await drizzleDb
        .select()
        .from(payments)
        .where(inArray(payments.invoice_id, invoiceIds));
    }

    // 7. Fetch standalone payments (no invoice)
    const unlinkedPayments = await drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.party_id, id))
      .where(eq(payments.invoice_id, null));

    // 8. Attach items + products + payments to each invoice
    const invoicesFull = invoicesData.map((inv) => ({
      ...inv,
      items: invoiceItems
        .filter((it) => it.invoice_id === inv.id)
        .map((it) => ({
          ...it,
          product: productsMap[it.product_id] ?? null, // Attach product details
        })),
      payments: paymentsForInvoices.filter((p) => p.invoice_id === inv.id),
    }));

    return {
      ...customer,
      addresses,
      invoices: invoicesFull,
      payments: {
        all: [...paymentsForInvoices, ...unlinkedPayments],
        unlinked: unlinkedPayments,
      },
    };
  };

  /* ===============================
   * ADD ADDRESS
   * ===============================*/
  const addCustomerAddress = async (customerId: string, address: any) => {
    const { drizzleDb, persistDb } = await useDb();
    const id = uuidv4();

    await drizzleDb.insert(party_addresses).values({
      id,
      party_id: customerId,
      ...address,
      created_at: now(),
      updated_at: now(),
    });

    await persistDb();
    return id;
  };

  /* ===============================
   * UPDATE ADDRESS
   * ===============================*/
  const updateCustomerAddress = async (customerId: string, address: any) => {
    const { drizzleDb, persistDb } = await useDb();

    await drizzleDb
      .update(party_addresses)
      .set({
        ...address,
        updated_at: now(),
      })
      .where(eq(party_addresses.id, address.id));

    await persistDb();
  };

  /* ===============================
   * DELETE ADDRESS
   * ===============================*/
  const deleteCustomerAddress = async (customerId: string, addressId: string) => {
    const { drizzleDb, persistDb } = await useDb();

    await drizzleDb.delete(party_addresses).where(eq(party_addresses.id, addressId));

    await persistDb();
  };

  return {
    customers,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    addCustomerAddress,
    updateCustomerAddress,
    deleteCustomerAddress,
  };
};