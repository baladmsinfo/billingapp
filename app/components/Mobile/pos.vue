<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useProducts } from "@/composables/pos/useProducts";
import { useCategories } from "@/composables/pos/useCategories";
import { useCart } from "@/composables/pos/useCart";
import PaymentPanel from "@/components/PaymentPanel.vue";
import { DEFAULT_COMPANY_ID } from "@/constants/company";

const COMPANY_ID = DEFAULT_COMPANY_ID;

/* ---------------- STATE ---------------- */
const categories = ref<any[]>([]);
const subCategories = ref<any[]>([]);
const products = ref<any[]>([]);
const showPaymentPanel = ref(false);
const showCart = ref(false);
const showFilters = ref(false);
const showVariantModal = ref(false);
const selectedProduct = ref<any>(null);

const selectedCategoryId = ref<string | null>(null);
const selectedSubCategoryId = ref<string | null>(null);
const searchQuery = ref("");

/* ---------------- COMPOSABLES ---------------- */
const { listProducts } = useProducts();
const { getCategories } = useCategories();
const {
  createCart,
  getActiveCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  checkoutCart,
  ensureActiveCart,
} = useCart();

/* ---------------- CART ---------------- */
const activeCart = ref<{ id: string | null; items: any[] }>({
  id: null,
  items: [],
});

/* ---------------- LOAD ---------------- */
onMounted(async () => {
  categories.value =
    (await getCategories({ company_id: COMPANY_ID, parent_id: null })) || [];

  products.value = (await listProducts({ company_id: COMPANY_ID })) || [];

  const cart = await getActiveCart();
  activeCart.value = cart || (await createCartWithReload());
});

/* ---------------- CART HELPERS ---------------- */
const reloadCart = async () => {
  const cart = await getActiveCart();
  activeCart.value = cart || { id: null, items: [] };
};

const createCartWithReload = async () => {
  await createCart();
  await reloadCart();
  return activeCart.value;
};

/* ---------------- WATCH ---------------- */
watch(selectedCategoryId, async (id) => {
  selectedSubCategoryId.value = null;
  subCategories.value = id
    ? (await getCategories({ company_id: COMPANY_ID, parent_id: id })) || []
    : [];
});

/* ---------------- FILTERED PRODUCTS ---------------- */
const filteredProducts = computed(() =>
  products.value.filter(
    (p) =>
      (!selectedCategoryId.value || p.category_id === selectedCategoryId.value) &&
      (!selectedSubCategoryId.value ||
        p.sub_category_id === selectedSubCategoryId.value) &&
      (!searchQuery.value ||
        p.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
  )
);

/* ---------------- CART COMPUTED ---------------- */
const cartItems = computed(() => activeCart.value.items || []);

const subtotal = computed(() =>
  cartItems.value.reduce(
    (sum, i) => sum + Number(i.price) * Number(i.quantity),
    0
  )
);

const gst = computed(() => +(subtotal.value * 0.18).toFixed(2));
const total = computed(() => +(subtotal.value + gst.value).toFixed(2));

/* ---------------- ADD PRODUCT ---------------- */
const addProduct = async (p: any) => {
  if (!p?.id) return;

  if (p.items?.length) {
    selectedProduct.value = p;
    showVariantModal.value = true;
    return;
  }

  const cart = await ensureActiveCart();

  const existing = cartItems.value.find(
    (i) => i.product_id === p.id && i.item_id === p.id
  );

  if (existing) {
    await updateCartItem(existing.id, {
      quantity: existing.quantity + 1,
    });
  } else {
    await addCartItem({
      cart_id: cart.id,
      product_id: p.id,
      item_id: p.id,
      price: p.price,
      quantity: 1,
    });
  }

  await reloadCart();
};

/* ---------------- VARIANTS ---------------- */
const addVariant = async (p: any, v: any) => {
  const cart = await ensureActiveCart();

  const existing = cartItems.value.find(
    (c) => c.product_id === p.id && c.item_id === v.id
  );

  if (existing) {
    await updateCartItem(existing.id, {
      quantity: existing.quantity + 1,
    });
  } else {
    await addCartItem({
      cart_id: cart.id,
      product_id: p.id,
      item_id: v.id,
      price: v.price,
      quantity: 1,
    });
  }

  await reloadCart();
};

const removeVariant = async (p: any, v: any) => {
  const existing = cartItems.value.find(
    (c) => c.product_id === p.id && c.item_id === v.id
  );
  if (!existing) return;

  if (existing.quantity > 1) {
    await updateCartItem(existing.id, {
      quantity: existing.quantity - 1,
    });
  } else {
    await removeCartItem(existing.id);
  }

  await reloadCart();
};

/* ---------------- CART ITEM ---------------- */
const incQty = async (i: any) => {
  await updateCartItem(i.id, { quantity: i.quantity + 1 });
  await reloadCart();
};

const decQty = async (i: any) => {
  if (i.quantity <= 1) return;
  await updateCartItem(i.id, { quantity: i.quantity - 1 });
  await reloadCart();
};

const removeItem = async (i: any) => {
  await removeCartItem(i.id);
  await reloadCart();
};

/* ---------------- PAYMENT ---------------- */
const proceedToPay = () => {
  if (!cartItems.value.length) return alert("Cart empty");
  showPaymentPanel.value = true;
};

const confirmPayment = async (payload: { customer?: any; payments: { method: "CASH" | "UPI"; amount: number }[] }) => {
  if (!activeCart.value.id) return;

  const { payments, customer } = payload;

  await checkoutCart({
    cart_id: activeCart.value.id,
    payments,
    customer,
  });

  //showPaymentPanel.value = false;
  //showCart.value = false;
  //activeCart.value = { id: null, items: [] };

  //await createCartWithReload();
};

const completePayment = async () => {
    showPaymentPanel.value = false;
    showCart.value = false;
    activeCart.value = { id: null, items: [] };

    await createCartWithReload();
};


</script>

<template>
  <div class="pos-root">
    <!-- FILTER ICON -->
    <div class="filter-icon" @click="showFilters = !showFilters">
      <v-icon>mdi-filter-variant</v-icon>
      Filter
    </div>

    <!-- FILTER PANEL -->
    <transition name="slide-right">
      <div v-if="showFilters" class="filter-panel">
        <div class="filter-header">
          <span>Filters</span>
          <v-icon @click="showFilters = false">mdi-close</v-icon>
        </div>

        <v-tabs
          v-model="selectedCategoryId"
          slider-color="#6200ee"
          background-color="#f5f5f5"
          class="category-tabs"
          rounded
          grow
        >
          <v-tab :value="null">All</v-tab>
          <v-tab v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </v-tab>
        </v-tabs>

        <v-tabs
          v-if="subCategories.length"
          v-model="selectedSubCategoryId"
          slider-color="#6200ee"
          class="subcategory-tabs mt-2"
          rounded
          grow
        >
          <v-tab :value="null">All</v-tab>
          <v-tab v-for="sub in subCategories" :key="sub.id" :value="sub.id">
            {{ sub.name }}
          </v-tab>
        </v-tabs>

        <v-text-field
          v-model="searchQuery"
          placeholder="Search products…"
          clearable
          dense
          hide-details
          outlined
          prepend-inner-icon="mdi-magnify"
          class="search-field mt-4"
        />
      </div>
    </transition>

    <!-- PRODUCT GRID -->
    <div class="product-grid">
      <div v-for="p in filteredProducts" :key="p.id" class="product-card">
        <img src="https://dummyimage.com/300x300/000/fff" />
        <div class="name font-weight-bold">{{ p.name }}</div>
        <div class="price mb-2">₹{{ p.price }}</div>
        <v-btn
          block
          color="primary"
          :disabled="p.stock === 0"
          @click="addProduct(p)"
        >
          {{ p.stock === 0 ? "Out of Stock" : "Add" }}
        </v-btn>
      </div>
    </div>

    <!-- VARIANT MODAL -->
    <v-dialog v-model="showVariantModal" max-width="400">
      <v-card>
        <v-card-title>{{ selectedProduct?.name }}</v-card-title>
        <v-card-text>
          <div
            v-for="v in selectedProduct?.items"
            :key="v.id"
            class="variant-row"
          >
            <div>
              <strong>{{ v.variant }}</strong>
              <div>₹{{ v.price }}</div>
            </div>
            <div class="qty">
              <button class="mr-3" @click="removeVariant(selectedProduct, v)">−</button>
              <span>
                {{
                  cartItems.find(
                    (c) => c.product_id === selectedProduct.id && c.item_id === v.id
                  )?.quantity || 0
                }}
              </span>
              <button class="ml-3" @click="addVariant(selectedProduct, v)">+</button>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showVariantModal = false">Done</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- CART -->
    <transition name="slide-up">
      <div v-if="cartItems.length" class="cart">
        <div class="cart-header" @click="showCart = !showCart">
          <div>
            🛒 {{ cartItems.length }} items
            <span class="ml-3 mt-1">₹{{ total.toFixed(2) }}</span>
          </div>
          <span class="toggle">{{ showCart ? "▲" : "▼" }}</span>
        </div>

        <div v-if="showCart" class="cart-body">
          <div v-for="i in cartItems" :key="i.id" class="cart-item">
            <div class="item-left">
              <div class="title">{{ i.name }}</div>
              <div class="unit">₹{{ i.price }} × {{ i.quantity }}</div>
            </div>

            <div class="item-center mr-12">
              <button @click="decQty(i)">−</button>
              <span>{{ i.quantity }}</span>
              <button @click="incQty(i)">+</button>
            </div>

            <div class="item-right">
              ₹{{ (i.price * i.quantity).toFixed(2) }}
              <button class="remove" @click="removeItem(i)">✕</button>
            </div>
          </div>

          <div class="cart-summary">
            <div class="row"><span>Subtotal</span><span>₹{{ subtotal.toFixed(2) }}</span></div>
            <div class="row"><span>GST (18%)</span><span>₹{{ gst.toFixed(2) }}</span></div>
            <div class="row total"><span>Total</span><span>₹{{ total.toFixed(2) }}</span></div>
          </div>

          <v-btn block color="primary" class="checkout-btn" @click="proceedToPay">
            Proceed to Pay
          </v-btn>
        </div>
      </div>
    </transition>

    <!-- PAYMENT PANEL -->
    <PaymentPanel
      :cart="cartItems"
      :show="showPaymentPanel"
      @close="close"
      @confirm="confirmPayment"
      @done="completePayment"
    />
  </div>
</template>

<style scoped>
.pos-root {
  padding: 12px;
}

/* FILTER */
.filter-icon {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 8px;
  color: #6200ee;
}
.filter-panel {
  position: relative;
  width: 100%;
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.2);
  z-index: 500;
}
.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 12px;
}
.category-tabs, .subcategory-tabs { margin-bottom: 8px; }

/* PRODUCTS */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 100px; /* leave space for cart */
}
.product-card {
  background: #fff;
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}
.product-card img { width: 100%; border-radius: 10px; }
.name { font-weight: 600; margin-top: 4px; }
.price { color: green; margin: 4px 0; }

/* VARIANTS */
.variant-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.qty button {
  background: #6200ee;
  color: #fff;
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
}

/* CART */
.cart {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  z-index: 600;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.2);
}
.cart-header {
  padding: 12px;
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  cursor: pointer;
  background: #6200ee;
  color: #fff;
  border-radius: 16px 16px 0 0;
}
.cart-body {
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
}
.cart-item {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin-bottom: 8px;
}
.item-left { flex: 2; }
.item-center { display: flex; align-items: center; gap: 8px; }
.item-center button {
  border: none; border-radius: 6px;
  padding: 4px 8px; background: #6200ee; color: #fff;
}
.item-right { display: flex; align-items: center; gap: 6px; }
.remove { background: none; border: none; color: red; font-size: 1rem; }

/* SUMMARY */
.cart-summary {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #ccc;
}
.cart-summary .row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}
.cart-summary .total { font-weight: 700; font-size: 1.1rem; }

/* CHECKOUT */
.checkout-btn { margin-top: 10px; height: 48px; font-size: 1.05rem; }
</style>
