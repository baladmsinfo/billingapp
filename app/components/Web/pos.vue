<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useProducts } from '@/composables/pos/useProducts'
import { useCategories } from '@/composables/pos/useCategories'


const COMPANY_ID = 'LOCAL_COMPANY'

const categories = ref<any[]>([])
const subCategories = ref<any[]>([])
const products = ref<any[]>([])
const cart = ref<any[]>([])

const selectedCategoryId = ref<string | null>(null)
const selectedSubCategoryId = ref<string | null>(null)
const searchQuery = ref('')

const selectedProduct = ref<any>(null)
const selectedVariant = ref<any>(null)
const showVariantDialog = ref(false)

// ─── Composables ─────────────────────────────────────────────
const { listProducts } = useProducts()
const { getCategories } = useCategories()

// ─── Lifecycle ───────────────────────────────────────────────
onMounted(async () => {
  categories.value = (await getCategories({ company_id: COMPANY_ID, parent_id: null })) || []
  products.value = (await listProducts({ company_id: COMPANY_ID })) || []
})

// ─── Watchers ────────────────────────────────────────────────
watch(selectedCategoryId, async (catId) => {
  selectedSubCategoryId.value = null

  if (!catId) {
    subCategories.value = []
    return
  }

  subCategories.value = (await getCategories({ company_id: COMPANY_ID, parent_id: catId })) || []
})

// ─── Computed ─────────────────────────────────────────────────

// Filter products by category, subcategory, and search
const filteredProducts = computed(() => {
  return products.value.filter((p) => {
    const matchCategory = !selectedCategoryId.value || p.category_id === selectedCategoryId.value
    const matchSub = !selectedSubCategoryId.value || p.sub_category_id === selectedSubCategoryId.value
    const matchSearch = !searchQuery.value || p.name?.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchCategory && matchSub && matchSearch
  })
})

// Cart totals — GST is taken from item.tax_rate (e.g. 5, 12, 18, 28)
// If the item has no tax_rate we treat it as 0 (tax-exempt / inclusive)
const cartTotals = computed(() => {
  let subtotal = 0
  let totalTax = 0

  for (const item of cart.value) {
    const lineTotal = item.price * item.qty
    const taxRate = item.tax_rate ?? 0           // use whatever rate the product carries
    const taxAmount = lineTotal * (taxRate / 100)
    subtotal += lineTotal
    totalTax += taxAmount
  }

  return {
    subtotal,
    totalTax,
    grandTotal: subtotal + totalTax,
  }
})

const cartCount = computed(() => cart.value.reduce((sum, i) => sum + i.qty, 0))

// ─── Methods ─────────────────────────────────────────────────

function openProduct(product: any) {
  selectedProduct.value = product
  // Pre-select the first available variant
  selectedVariant.value = product.items?.find((i: any) => i.quantity > 0) ?? product.items?.[0] ?? null
  showVariantDialog.value = true
}

function closeDialog() {
  showVariantDialog.value = false
  selectedVariant.value = null
}

function selectVariant(item: any) {
  if (item.quantity === 0) return
  selectedVariant.value = item
}
function addToCart(item: any) {
  console.log('ADDING ITEM 👉', item)   // ✅ ADD THIS

  const existing = cart.value.find((c) => c.id === item.id)

  if (existing) {
    existing.qty++
  } else {
    cart.value.push({
      id: item.id,
      name: item.variant || item.name,
      price: Number(item.price),
      tax_rate: item.tax_rate ?? 0,
      qty: 1,
    })
  }
}

function addSelectedToCart() {
  if (!selectedVariant.value) return
  addToCart(selectedVariant.value)
  closeDialog()
}

function increaseQty(id: string) {
  const item = cart.value.find((i) => i.id === id)
  if (item) item.qty++
}

function decreaseQty(id: string) {
  const item = cart.value.find((i) => i.id === id)
  if (item && item.qty > 1) item.qty--
}

function removeFromCart(id: string) {
  cart.value = cart.value.filter((i) => i.id !== id)
}

function checkout() {
  const bill = {
    items: cart.value,
    subtotal: cartTotals.value.subtotal,
    tax: cartTotals.value.totalTax,
    total: cartTotals.value.grandTotal,
    date: new Date(),
  }

  console.log('Invoice:', bill)
  alert(`Order placed successfully!\nTotal: ₹${cartTotals.value.grandTotal.toFixed(2)}`)
  cart.value = []
}
</script>

<template>
  <div class="pos-root">

    <!-- ═══════════════════════════════════════
         LEFT — PRODUCTS PANEL
    ════════════════════════════════════════ -->
    <section class="products-panel" :class="{ expanded: cart.length === 0 }">

      <!-- Top bar -->
      <div class="top-bar">
        <div class="brand-mark">
          <div class="brand-icon-wrap">
            <v-icon size="20" color="primary">mdi-point-of-sale</v-icon>
          </div>
          <div>
            <div class="brand-name">POS Terminal</div>
            <div class="brand-sub">Quick Sales</div>
          </div>
        </div>

        <div class="search-wrapper">
          <v-text-field
            v-model="searchQuery"
            placeholder="Search products…"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            hide-details
            bg-color="white"
            class="search-field"
          />
        </div>

        <!-- Cart indicator — only shows when cart has items -->
        <div v-if="cart.length > 0" class="cart-indicator">
          <v-badge :content="cartCount" color="primary" floating>
            <v-icon size="22" color="primary">mdi-cart-outline</v-icon>
          </v-badge>
          <span class="cart-indicator-label">Cart</span>
        </div>
      </div>

      <!-- Category filters -->
      <div class="filter-area">
        <div class="filter-label">
          <v-icon size="13" class="mr-1" color="grey">mdi-shape-outline</v-icon>
          Categories
        </div>
        <div class="category-bar">
          <v-chip
            class="cat-chip"
            :color="selectedCategoryId === null ? 'primary' : undefined"
            :variant="selectedCategoryId === null ? 'flat' : 'tonal'"
            size="small"
            @click="selectedCategoryId = null"
          >
            All
          </v-chip>
          <v-chip
            v-for="cat in categories"
            :key="cat.id"
            class="cat-chip"
            :color="selectedCategoryId === cat.id ? 'primary' : undefined"
            :variant="selectedCategoryId === cat.id ? 'flat' : 'tonal'"
            size="small"
            @click="selectedCategoryId = cat.id"
          >
            {{ cat.name }}
          </v-chip>
        </div>

        <div v-if="subCategories.length > 0" class="subcategory-bar">
          <v-chip
            class="sub-chip"
            :color="selectedSubCategoryId === null ? 'indigo' : undefined"
            :variant="selectedSubCategoryId === null ? 'flat' : 'outlined'"
            size="x-small"
            @click="selectedSubCategoryId = null"
          >
            All
          </v-chip>
          <v-chip
            v-for="sub in subCategories"
            :key="sub.id"
            class="sub-chip"
            :color="selectedSubCategoryId === sub.id ? 'indigo' : undefined"
            :variant="selectedSubCategoryId === sub.id ? 'flat' : 'outlined'"
            size="x-small"
            @click="selectedSubCategoryId = sub.id"
          >
            {{ sub.name }}
          </v-chip>
        </div>
      </div>

      <!-- Results count -->
      <div class="results-bar">
        <span class="results-count">{{ filteredProducts.length }}</span>
        <span class="results-text">products found</span>
      </div>

      <!-- Product grid -->
      <div class="product-grid">
        <div
          v-for="p in filteredProducts"
          :key="p.id"
          class="product-card"
          @click="openProduct(p)"
        >
          <div class="card-image-wrap">
            <img
              :src="p.image || 'https://dummyimage.com/300x300/e8edf5/1565c0&text=No+Image'"
              :alt="p.name"
            />
            <div class="card-hover-overlay">
              <v-btn
                size="small"
                color="primary"
                elevation="4"
                class="add-btn-overlay"
                icon
              >
                <v-icon size="18">mdi-plus</v-icon>
              </v-btn>
            </div>
            <div v-if="p.items?.length > 1" class="variants-badge">
              {{ p.items.length }} variants
            </div>
          </div>

          <div class="card-info">
            <p class="card-name">{{ p.name }}</p>
            <div class="card-bottom">
              <span class="card-price">₹{{ p.items?.[0]?.price ?? 0 }}</span>
              <v-icon size="14" color="primary" class="card-arrow">mdi-chevron-right</v-icon>
            </div>
          </div>
        </div>

        <div v-if="filteredProducts.length === 0" class="no-products">
          <v-icon size="52" color="grey-lighten-1">mdi-package-variant-remove</v-icon>
          <p class="no-products-title">No products found</p>
          <p class="no-products-sub">Try adjusting your search or filters</p>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════
         RIGHT — CART PANEL
         Only rendered when cart has items
    ════════════════════════════════════════ -->
    <transition name="cart-slide">
      <aside v-if="cart.length > 0" class="cart-panel">

        <div class="cart-header">
          <div>
            <h2 class="cart-title">Current Order</h2>
            <div class="cart-subtitle">{{ cartCount }} item{{ cartCount !== 1 ? 's' : '' }} in cart</div>
          </div>
          <v-chip color="primary" variant="flat" size="small" class="font-weight-bold">
            <v-icon start size="14">mdi-cart</v-icon>
            {{ cartCount }}
          </v-chip>
        </div>

        <div class="cart-body">
          <transition-group name="item-anim" tag="div" class="cart-list">
            <div v-for="item in cart" :key="item.id" class="cart-item">

              <div class="cart-item-avatar">
                <v-icon size="18" color="primary">mdi-package-variant-closed</v-icon>
              </div>

              <div class="cart-item-info">
                <p class="cart-item-name">{{ item.name }}</p>
                <p class="cart-item-rate">
                  ₹{{ item.price }}
                  <v-chip v-if="item.tax_rate > 0" size="x-small" color="teal" variant="tonal" class="ml-1">
                    {{ item.tax_rate }}% GST
                  </v-chip>
                </p>
              </div>

              <div class="cart-item-qty">
                <v-btn icon size="x-small" variant="tonal" color="primary" @click="decreaseQty(item.id)">
                  <v-icon size="14">mdi-minus</v-icon>
                </v-btn>
                <span class="qty-value">{{ item.qty }}</span>
                <v-btn icon size="x-small" variant="tonal" color="primary" @click="increaseQty(item.id)">
                  <v-icon size="14">mdi-plus</v-icon>
                </v-btn>
              </div>

              <div class="cart-item-total">
                <p class="cart-item-amount">₹{{ (item.price * item.qty).toFixed(2) }}</p>
                <v-btn icon size="x-small" variant="plain" color="red" @click="removeFromCart(item.id)">
                  <v-icon size="14">mdi-close</v-icon>
                </v-btn>
              </div>

            </div>
          </transition-group>
        </div>

        <!-- Bill summary -->
        <div class="bill-summary">
          <v-card class="pa-4 rounded-xl" elevation="0" color="grey-lighten-4">
            <div class="bill-row">
              <span class="bill-label">Subtotal</span>
              <span class="bill-value">₹{{ cartTotals.subtotal.toFixed(2) }}</span>
            </div>

            <div v-if="cartTotals.totalTax > 0" class="bill-row tax-row">
              <span class="bill-label">
                <v-icon size="12" class="mr-1" color="teal">mdi-percent</v-icon>
                GST / Tax
              </span>
              <span class="bill-value text-teal">₹{{ cartTotals.totalTax.toFixed(2) }}</span>
            </div>

            <v-divider class="my-3" />

            <div class="bill-row total-row">
              <span class="total-label">Grand Total</span>
              <span class="total-value text-primary">₹{{ cartTotals.grandTotal.toFixed(2) }}</span>
            </div>
          </v-card>
        </div>

        <div class="cart-footer">
          <v-btn
            block
            color="primary"
            size="large"
            elevation="2"
            class="checkout-btn rounded-xl py-3"
            @click="checkout"
          >
            <v-icon start size="18">mdi-receipt-text-check-outline</v-icon>
            Place Order · ₹{{ cartTotals.grandTotal.toFixed(2) }}
          </v-btn>
        </div>

      </aside>
    </transition>

    <!-- ═══════════════════════════════════════
         VARIANT DIALOG
    ════════════════════════════════════════ -->
    <v-dialog v-model="showVariantDialog" max-width="560">
      <v-card v-if="selectedProduct" class="rounded-xl dialog-card" elevation="8">

        <!-- Product hero -->
        <div class="dialog-hero">
          <img
            :src="selectedProduct.image || 'https://dummyimage.com/560x180/e8edf5/1565c0&text=' + encodeURIComponent(selectedProduct.name)"
            :alt="selectedProduct.name"
            class="dialog-hero-img"
          />
          <div class="dialog-hero-gradient"></div>
          <div class="dialog-hero-content">
            <h3 class="dialog-product-name">{{ selectedProduct.name }}</h3>
          </div>
          <v-btn
            icon
            size="small"
            variant="flat"
            color="white"
            class="dialog-close-btn"
            @click="closeDialog"
          >
            <v-icon size="16" color="grey-darken-2">mdi-close</v-icon>
          </v-btn>
        </div>

        <!-- Body -->
        <div class="dialog-body pa-5">

          <p v-if="selectedProduct.description" class="dialog-description text-body-2 text-grey-darken-1 mb-4">
            {{ selectedProduct.description }}
          </p>

          <div class="text-caption font-weight-bold text-uppercase text-grey mb-3" style="letter-spacing:0.08em">
            <v-icon size="12" class="mr-1">mdi-tag-multiple-outline</v-icon>
            Choose a variant
          </div>

          <p v-if="!selectedProduct.items?.length" class="text-body-2 text-grey pa-3">
            No variants available for this product.
          </p>

          <!-- Variant list -->
          <div class="dialog-variants">
            <div
              v-for="item in selectedProduct.items || []"
              :key="item.id"
              class="variant-row"
              :class="{
                'variant-selected': selectedVariant?.id === item.id,
                'variant-oos': item.quantity === 0
              }"
              @click="selectVariant(item)"
            >
              <div class="variant-left">
                <div class="d-flex align-center gap-2">
                  <v-icon
                    size="14"
                    :color="selectedVariant?.id === item.id ? 'primary' : 'grey'"
                  >
                    {{ selectedVariant?.id === item.id ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
                  </v-icon>
                  <p class="variant-name">{{ item.variant }}</p>
                </div>
                <p
                  class="variant-stock ml-5"
                  :class="{
                    'text-orange': item.quantity > 0 && item.quantity < 5,
                    'text-red': item.quantity === 0,
                    'text-grey': item.quantity >= 5
                  }"
                >
                  {{ item.quantity === 0
                      ? 'Out of stock'
                      : item.quantity < 5
                        ? `Only ${item.quantity} left`
                        : `${item.quantity} in stock`
                  }}
                </p>
              </div>

              <div class="variant-right">
                <v-chip v-if="item.tax_rate > 0" size="x-small" color="teal" variant="tonal" class="mr-2">
                  {{ item.tax_rate }}% GST
                </v-chip>
                <span class="variant-price">₹{{ item.price }}</span>
                <v-icon
                  v-if="selectedVariant?.id === item.id"
                  size="16"
                  color="primary"
                  class="ml-2"
                >
                  mdi-check-circle
                </v-icon>
              </div>
            </div>
          </div>

          <!-- Footer actions -->
          <v-divider class="my-4" />

          <div class="dialog-footer">
            <div class="dialog-price-preview" v-if="selectedVariant">
              <div class="text-caption text-grey mb-1">Selected price</div>
              <div class="text-h5 font-weight-bold text-primary">
                ₹{{ selectedVariant.price }}
              </div>
              <div v-if="selectedVariant.tax_rate > 0" class="text-caption text-grey">
                + ₹{{ (selectedVariant.price * selectedVariant.tax_rate / 100).toFixed(2) }} tax
              </div>
            </div>
            <div v-else class="dialog-price-preview">
              <div class="text-caption text-grey">Pick a variant to continue</div>
            </div>

            <div class="dialog-buttons">
              <v-btn
                variant="tonal"
                color="grey"
                class="rounded-lg mr-2"
                @click="closeDialog"
              >
                Cancel
              </v-btn>
              <v-btn
                color="primary"
                variant="flat"
                elevation="2"
                class="rounded-lg"
                :disabled="!selectedVariant || selectedVariant.quantity === 0"
                @click="addSelectedToCart"
              >
                <v-icon start size="16">mdi-cart-plus</v-icon>
                Add to Cart
              </v-btn>
            </div>
          </div>
        </div>
      </v-card>
    </v-dialog>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

/* ─── Design Tokens ─────────────────────────────────────── */
:root {
  --bg-base:        #f4f6f9;
  --bg-surface:     #ffffff;
  --bg-elevated:    #f8fafc;
  --bg-hover:       #f1f5f9;

  --border-faint:   #e8ecf0;
  --border-subtle:  #dde3ea;

  --text-primary:   #1e293b;
  --text-secondary: #475569;
  --text-muted:     #94a3b8;

  --font-sans:      'Plus Jakarta Sans', sans-serif;

  --ease-out:       cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out:    cubic-bezier(0.4, 0, 0.2, 1);
  --t-fast:         0.15s;
  --t-med:          0.25s;
  --t-slow:         0.38s;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ─── Root Layout ───────────────────────────────────────── */
.pos-root {
  display: flex;
  height: 100vh;
  background: var(--bg-base);
  font-family: var(--font-sans);
  color: var(--text-primary);
  overflow: hidden;
}

/* ════════════════════════════════════════
   PRODUCTS PANEL
════════════════════════════════════════ */
.products-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: flex var(--t-slow) var(--ease-in-out);
}

.products-panel.expanded {
  /* no border needed */
}

/* ── Top bar ── */
.top-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 24px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-faint);
  flex-shrink: 0;
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.brand-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #e8f0fe 0%, #c7d9ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ccd9f8;
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  line-height: 1.1;
}

.brand-sub {
  font-size: 10.5px;
  color: var(--text-muted);
  font-weight: 500;
  letter-spacing: 0.02em;
}

/* Search */
.search-wrapper {
  flex: 1;
  max-width: 420px;
}

.search-field :deep(.v-field) {
  border-radius: 10px !important;
  font-family: var(--font-sans) !important;
  font-size: 13px !important;
}

/* Cart indicator */
.cart-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  background: #e8f0fe;
  border: 1px solid #ccd9f8;
  cursor: default;
}

.cart-indicator-label {
  font-size: 12px;
  font-weight: 600;
  color: #1565c0;
}

/* ── Filters ── */
.filter-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 24px 10px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-faint);
  flex-shrink: 0;
}

.filter-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  display: flex;
  align-items: center;
}

.category-bar,
.subcategory-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  flex-wrap: wrap;
}

.category-bar::-webkit-scrollbar,
.subcategory-bar::-webkit-scrollbar { display: none; }

.cat-chip,
.sub-chip {
  cursor: pointer !important;
  font-family: var(--font-sans) !important;
  font-weight: 500 !important;
  transition: all var(--t-fast) !important;
}

/* Results bar */
.results-bar {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 24px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-faint);
  background: var(--bg-elevated);
}

.results-count {
  font-size: 13px;
  font-weight: 700;
  color: #1565c0;
}

.results-text {
  font-size: 11.5px;
  color: var(--text-muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ── Product Grid ── */
.product-grid {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 16px;
  align-content: start;
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
}

.product-card {
  background: var(--bg-surface);
  border-radius: 14px;
  border: 1px solid var(--border-faint);
  overflow: hidden;
  cursor: pointer;
  transition:
    transform var(--t-med) var(--ease-out),
    border-color var(--t-med),
    box-shadow var(--t-med);
}

.product-card:hover {
  border-color: #90b4f8;
  transform: translateY(-3px) scale(1.01);
  box-shadow:
    0 8px 28px rgba(21, 101, 192, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-image-wrap {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--bg-elevated);
}

.card-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s var(--ease-out);
}

.product-card:hover .card-image-wrap img {
  transform: scale(1.06);
}

.card-hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(21, 101, 192, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--t-med);
}

.product-card:hover .card-hover-overlay {
  opacity: 1;
}

.add-btn-overlay {
  transform: scale(0.85);
  transition: transform var(--t-med) var(--ease-out);
}

.product-card:hover .add-btn-overlay {
  transform: scale(1);
}

.variants-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255,255,255,0.92);
  border: 1px solid var(--border-faint);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 2px 8px;
  backdrop-filter: blur(4px);
}

.card-info {
  padding: 11px 13px 13px;
  border-top: 1px solid var(--border-faint);
}

.card-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}

.card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-price {
  font-size: 14px;
  font-weight: 700;
  color: #1565c0;
  letter-spacing: -0.02em;
}

.card-arrow {
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity var(--t-fast), transform var(--t-fast);
}

.product-card:hover .card-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* Empty state */
.no-products {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 72px 0;
  gap: 10px;
}

.no-products-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.no-products-sub {
  font-size: 12px;
  color: var(--text-muted);
}

/* ════════════════════════════════════════
   CART PANEL
════════════════════════════════════════ */
.cart-panel {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-faint);
  overflow: hidden;
}

/* Slide transition */
.cart-slide-enter-active {
  transition: all var(--t-slow) var(--ease-out);
}

.cart-slide-leave-active {
  transition: all 0.26s var(--ease-in-out);
}

.cart-slide-enter-from,
.cart-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Cart header */
.cart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 16px;
  border-bottom: 1px solid var(--border-faint);
  flex-shrink: 0;
  background: var(--bg-surface);
}

.cart-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.cart-subtitle {
  font-size: 11.5px;
  color: var(--text-muted);
  font-weight: 500;
  margin-top: 2px;
}

/* Cart body */
.cart-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
  background: var(--bg-elevated);
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
  background: var(--bg-surface);
  border: 1px solid var(--border-faint);
  border-radius: 12px;
  transition:
    border-color var(--t-fast),
    box-shadow var(--t-fast);
}

.cart-item:hover {
  border-color: #90b4f8;
  box-shadow: 0 2px 12px rgba(21, 101, 192, 0.08);
}

.cart-item-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #e8f0fe;
  border: 1px solid #ccd9f8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cart-item-info {
  flex: 1;
  min-width: 0;
}

.cart-item-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
  letter-spacing: -0.01em;
}

.cart-item-rate {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
}

/* Qty controls */
.cart-item-qty {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 3px 6px;
}

.qty-value {
  font-size: 13px;
  font-weight: 700;
  min-width: 22px;
  text-align: center;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

/* Item total + remove */
.cart-item-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.cart-item-amount {
  font-size: 13px;
  font-weight: 700;
  color: #1565c0;
  letter-spacing: -0.02em;
}

/* Item animations */
.item-anim-enter-active,
.item-anim-leave-active {
  transition: all 0.22s var(--ease-out);
}

.item-anim-enter-from {
  opacity: 0;
  transform: translateX(14px) scale(0.97);
}

.item-anim-leave-to {
  opacity: 0;
  transform: translateX(-14px) scale(0.97);
}

/* Bill summary */
.bill-summary {
  padding: 14px 16px 10px;
  border-top: 1px solid var(--border-faint);
  flex-shrink: 0;
}

.bill-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.bill-row:last-child {
  margin-bottom: 0;
}

.bill-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  display: flex;
  align-items: center;
}

.bill-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.total-label {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.total-value {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

/* Cart footer / Checkout button */
.cart-footer {
  padding: 12px 16px 16px;
  flex-shrink: 0;
  border-top: 1px solid var(--border-faint);
  background: var(--bg-surface);
}

.checkout-btn {
  font-family: var(--font-sans) !important;
  font-weight: 700 !important;
  font-size: 13.5px !important;
  letter-spacing: 0.01em !important;
}

/* ════════════════════════════════════════
   VARIANT DIALOG
════════════════════════════════════════ */
.dialog-card {
  overflow: hidden;
  font-family: var(--font-sans);
}

/* Hero */
.dialog-hero {
  position: relative;
  height: 180px;
  overflow: hidden;
}

.dialog-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.5s var(--ease-out);
}

.dialog-card:hover .dialog-hero-img {
  transform: scale(1.04);
}

.dialog-hero-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 30%,
    rgba(10, 20, 50, 0.75) 100%
  );
}

.dialog-hero-content {
  position: absolute;
  bottom: 14px;
  left: 18px;
  right: 52px;
}

.dialog-product-name {
  font-size: 21px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 1px 10px rgba(0,0,0,0.5);
  letter-spacing: -0.02em;
  line-height: 1.25;
}

/* Close button */
.dialog-close-btn {
  position: absolute !important;
  top: 12px !important;
  right: 12px !important;
  background: rgba(255,255,255,0.92) !important;
  border: 1px solid rgba(0,0,0,0.08) !important;
  backdrop-filter: blur(8px) !important;
}

/* Variant rows */
.dialog-variants {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 4px;
  max-height: 240px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
}

.variant-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-faint);
  border-radius: 12px;
  cursor: pointer;
  transition:
    border-color var(--t-fast),
    background var(--t-fast),
    box-shadow var(--t-fast);
}

.variant-row:hover:not(.variant-oos) {
  border-color: #90b4f8;
  background: #f0f5ff;
  box-shadow: 0 2px 10px rgba(21, 101, 192, 0.08);
}

.variant-row.variant-selected {
  border-color: #1565c0;
  background: #e8f0fe;
  box-shadow: 0 0 0 1px rgba(21, 101, 192, 0.2), 0 2px 12px rgba(21, 101, 192, 0.12);
}

.variant-row.variant-oos {
  opacity: 0.42;
  cursor: not-allowed;
}

.variant-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.variant-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.variant-stock {
  font-size: 10.5px;
  font-weight: 500;
  margin-top: 2px;
}

.variant-right {
  display: flex;
  align-items: center;
}

.variant-price {
  font-size: 16px;
  font-weight: 700;
  color: #1565c0;
  letter-spacing: -0.03em;
}

/* Dialog footer */
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.dialog-price-preview {
  min-width: 0;
}

.dialog-buttons {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.dialog-description {
  line-height: 1.65;
}
</style>