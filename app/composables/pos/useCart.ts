import { useDb } from "@/db/client.js";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import {
  carts,
  cart_items,
  invoices,
  invoice_items,
  payments,
  sync_queue,
  parties,
  items,
  products,
} from "@/db/schema.js";
import { DEFAULT_COMPANY_ID } from "@/constants/company";

const now = () => Math.floor(Date.now() / 1000);

export function useCart() {
  const companyId = DEFAULT_COMPANY_ID;

  const dbReady = async () => {
    const { drizzleDb, persistDb } = await useDb();
    return { drizzleDb, persistDb };
  };

  /* =========================================================
     🔁 SYNC QUEUE
  ========================================================= */
  const enqueueSync = async ({ entity, entity_id, action, payload }: any) => {
    const { drizzleDb } = await dbReady();
    await drizzleDb.insert(sync_queue).values({
      id: uuidv4(),
      entity,
      entity_id,
      action,
      payload: JSON.stringify(payload),
      status: "PENDING",
      retry_count: 0,
      created_at: now(),
      updated_at: now(),
    });
  };

  /* =========================================================
     🛒 CART
  ========================================================= */
  const createCart = async (
    data: {
      party_id?: string;
      party_address_id?: string;
      [key: string]: any;
    } = {}
  ) => {
    const { drizzleDb, persistDb } = await dbReady();
    const id = uuidv4();

    await drizzleDb.insert(carts).values({
      id,
      company_id: companyId,
      status: "ACTIVE",
      ...data,
      created_at: now(),
      updated_at: now(),
    });

    await persistDb();
    localStorage.setItem("active_cart_id", id);

    return {
      id,
      company_id: companyId,
      status: "ACTIVE",
      items: [],
      party_id: data.party_id ?? null,
      party_address_id: data.party_address_id ?? null,
    };
  };

  const getActiveCart = async () => {
    const { drizzleDb } = await dbReady();
    let cartId = localStorage.getItem("active_cart_id");
    let cart;

    // 1️⃣ Try fetching cart by localStorage
    if (cartId) {
      [cart] = await drizzleDb
        .select()
        .from(carts)
        .where(eq(carts.id, cartId))
        .limit(1);
    }

    // 2️⃣ Fallback: fetch first active cart for company
    if (!cart) {
      [cart] = await drizzleDb
        .select()
        .from(carts)
        .where(and(eq(carts.status, "ACTIVE"), eq(carts.company_id, companyId)))
        .limit(1);
    }

    // 3️⃣ If no cart, create a new one
    if (!cart) return await createCart();

    // 4️⃣ Save active cart in localStorage
    localStorage.setItem("active_cart_id", cart.id);

    // 5️⃣ Fetch cart items with product names
    const cartItems = await drizzleDb
      .select({
        id: cart_items.id,
        cart_id: cart_items.cart_id,
        item_id: cart_items.item_id,
        product_id: cart_items.product_id,
        quantity: cart_items.quantity,
        price: cart_items.price,
        total: cart_items.total,
        name: products.name, // ✅ now from products
      })
      .from(cart_items)
      .leftJoin(products, eq(products.id, cart_items.product_id)) // join products table
      .where(eq(cart_items.cart_id, cart.id));

    return { ...cart, items: cartItems };
  };

  const ensureActiveCart = async (partyData?: {
    party_id?: string;
    party_address_id?: string;
  }) => {
    let cart = await getActiveCart();
    if (!cart?.id) return await createCart(partyData);

    // Optionally update cart with party info if provided
    if (partyData?.party_id || partyData?.party_address_id) {
      const { drizzleDb, persistDb } = await dbReady();
      await drizzleDb
        .update(carts)
        .set({
          party_id: partyData.party_id ?? cart.party_id,
          party_address_id: partyData.party_address_id ?? cart.party_address_id,
          updated_at: now(),
        })
        .where(eq(carts.id, cart.id));
      await persistDb();

      cart = { ...cart, ...partyData };
    }

    return cart;
  };

  /* =========================================================
     📦 CART ITEMS
  ========================================================= */
  const addCartItem = async (data: {
    cart_id: string;
    product_id: string;
    item_id: string;
    quantity: number;
    price: number;
  }) => {
    if (!data.cart_id || !data.product_id || !data.item_id)
      throw new Error("Cart ID, Product ID, and Item ID are required");

    const { drizzleDb, persistDb } = await dbReady();
    const id = uuidv4();

    await drizzleDb.insert(cart_items).values({
      id,
      cart_id: data.cart_id,
      product_id: data.product_id,
      item_id: data.item_id,
      quantity: data.quantity,
      price: data.price,
      total: +(data.quantity * data.price).toFixed(2),
      created_at: now(),
      updated_at: now(),
    });

    await recalcCartTotal(data.cart_id);

    await enqueueSync({
      entity: "cart_items",
      entity_id: id,
      action: "CREATE",
      payload: data,
    });
    await persistDb();

    return id;
  };

  const updateCartItem = async (cart_item_id: string, updates: any) => {
    const { drizzleDb, persistDb } = await dbReady();
    const [item] = await drizzleDb
      .select()
      .from(cart_items)
      .where(eq(cart_items.id, cart_item_id))
      .limit(1);
    if (!item) throw new Error("Item not found");

    const quantity = updates.quantity ?? item.quantity;
    const price = updates.price ?? item.price;

    await drizzleDb
      .update(cart_items)
      .set({
        quantity,
        price,
        total: +(quantity * price).toFixed(2),
        updated_at: now(),
      })
      .where(eq(cart_items.id, cart_item_id));

    await recalcCartTotal(item.cart_id);
    await persistDb();
  };

  const removeCartItem = async (cart_item_id: string) => {
    const { drizzleDb, persistDb } = await dbReady();
    const [item] = await drizzleDb
      .select()
      .from(cart_items)
      .where(eq(cart_items.id, cart_item_id))
      .limit(1);
    if (!item) return;

    await drizzleDb.delete(cart_items).where(eq(cart_items.id, cart_item_id));
    await recalcCartTotal(item.cart_id);
    await persistDb();
  };

  const recalcCartTotal = async (cart_id: string) => {
    const { drizzleDb } = await dbReady();
    const items = await drizzleDb
      .select()
      .from(cart_items)
      .where(eq(cart_items.cart_id, cart_id));
    const total = +items.reduce((s, i) => s + i.total, 0).toFixed(2);

    await drizzleDb
      .update(carts)
      .set({ total_amount: total, updated_at: now() })
      .where(eq(carts.id, cart_id));
    return total;
  };

  /* =========================================================
     🧾 CHECKOUT
  ========================================================= */
  type PaymentInput = {
    method: "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER";
    amount: number;
  };

  interface CustomerInput {
    name?: string;
    phone?: string;
    email?: string;
    address?: {
      address_line1?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
  }

  const checkoutCart = async ({
    cart_id,
    payments: paymentInputs,
    customer,
  }: {
    cart_id: string;
    payments?: PaymentInput[];
    customer?: CustomerInput;
  }) => {
    const { drizzleDb, persistDb } = await dbReady();

    // 1️⃣ Fetch cart
    const [cart] = await drizzleDb
      .select()
      .from(carts)
      .where(eq(carts.id, cart_id))
      .limit(1);

    if (!cart) throw new Error("Cart not found");

    // 2️⃣ Fetch cart items
    const items = await drizzleDb
      .select()
      .from(cart_items)
      .where(eq(cart_items.cart_id, cart_id));

    if (!items.length) throw new Error("Cart is empty");

    // 3️⃣ Ensure customer
    let partyId = cart.party_id;
    let partyAddressId = cart.party_address_id;

    if (!partyId && customer) {
      const created = await createCustomer(customer);
      partyId = created.partyId;
      partyAddressId = created.addressId;

      await drizzleDb
        .update(carts)
        .set({
          party_id: partyId,
          party_address_id: partyAddressId,
          updated_at: now(),
        })
        .where(eq(carts.id, cart_id));
    }

    // 4️⃣ Calculate totals
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const tax = +(subtotal * 0.18).toFixed(2); // 18% GST
    const total = +(subtotal + tax).toFixed(2);

    const safePayments = paymentInputs?.length
      ? paymentInputs
      : [{ method: "CASH", amount: total }];

    const totalPaid = safePayments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid > total)
      throw new Error("Total payment exceeds invoice total");

    const balance = +(total - totalPaid).toFixed(2);
    const invoiceId = uuidv4();

    // 5️⃣ Create Invoice
    await drizzleDb.insert(invoices).values({
      id: invoiceId,
      invoice_number: `POS-${Date.now()}`,
      company_id: companyId,
      party_id: partyId ?? null,
      billing_address_id: partyAddressId ?? null,
      shipping_address_id: partyAddressId ?? null,
      date: now(),
      due_date: now(),
      status: balance > 0 ? "PARTIAL" : "PAID",
      type: "POS",
      total_amount: total,
      tax_amount: tax,
      created_at: now(),
      updated_at: now(),
    });

    // 6️⃣ Insert Invoice Items
    for (const i of items) {
      await drizzleDb.insert(invoice_items).values({
        id: uuidv4(),
        invoice_id: invoiceId,
        item_id: i.item_id,
        product_id: i.product_id,
        quantity: i.quantity,
        price: i.price,
        total: i.total,
        paid_amount: +(i.total * (totalPaid / total)).toFixed(2),
        tax_rate_id: i.tax_rate_id ?? null,
        status: "ORDERED",
        created_at: now(),
        updated_at: now(),
      });
    }

    // 7️⃣ Record Payments
    for (const p of safePayments) {
      if (p.amount <= 0) continue;

      await drizzleDb.insert(payments).values({
        id: uuidv4(),
        invoice_id: invoiceId,
        company_id: companyId,
        party_id: partyId ?? null,
        amount: p.amount,
        type: balance > 0 ? "PARTIAL" : "FULL",
        method: p.method,
        status: "SUCCESS",
        date: now(),
        created_at: now(),
        updated_at: now(),
      });
    }

    // 8️⃣ Update Cart Status
    await drizzleDb
      .update(carts)
      .set({ status: balance > 0 ? "HOLD" : "CHECKEDOUT", updated_at: now() })
      .where(eq(carts.id, cart_id));

    await persistDb();
    localStorage.removeItem("active_cart_id");

    return {
      invoiceId,
      total,
      totalPaid,
      balance,
      partyId,
      partyAddressId,
      payments: safePayments,
      items,
    };
  };

  interface CustomerInput {
    name?: string;
    phone?: string;
    email?: string;
    address?: {
      address_line1?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
  }

  const createCustomer = async (data?: CustomerInput) => {
    const { drizzleDb, persistDb } = await useDb();

    // 1️⃣ Check if customer with same phone exists
    if (data?.phone) {
      const existing = await drizzleDb
        .select()
        .from(parties)
        .where(eq(parties.phone, data.phone))
        .limit(1);

      if (existing.length > 0) {
        return {
          partyId: existing[0].id,
          addressId: null,
          isExisting: true,
        };
      }
    }

    // 2️⃣ If not exists, create new customer
    const partyId = uuidv4();
    const addressId = data?.address ? uuidv4() : null;

    await drizzleDb.insert(parties).values({
      id: partyId,
      company_id: DEFAULT_COMPANY_ID,
      type: "CUSTOMER",
      name: data?.name || "Walk-in Customer",
      phone: data?.phone ?? null,
      email: data?.email ?? null,
      created_at: now(),
      updated_at: now(),
    });

    // Insert address if provided
    if (addressId && data?.address) {
      await drizzleDb.insert(party_addresses).values({
        id: addressId,
        party_id: partyId,
        address_line1: data.address.address_line1 ?? null,
        city: data.address.city ?? null,
        state: data.address.state ?? null,
        pincode: data.address.pincode ?? null,
        address_type: "BILLING",
        is_default: 1,
        created_at: now(),
        updated_at: now(),
      });
    }

    await persistDb();

    return { partyId, addressId, isExisting: false };
  };

  return {
    createCart,
    getActiveCart,
    ensureActiveCart,
    addCartItem,
    updateCartItem,
    removeCartItem,
    recalcCartTotal,
    checkoutCart,
    createCustomer,
  };
}
