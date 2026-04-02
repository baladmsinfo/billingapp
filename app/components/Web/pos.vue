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
          <span class="brand-icon">⊛</span>
          <span class="brand-name">POS Terminal</span>
        </div>

        <div class="search-wrapper">
          <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="Search products…"
          />
        </div>

        <!-- Cart indicator — only shows when cart has items -->
        <div v-if="cart.length > 0" class="cart-indicator">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span class="indicator-badge">{{ cartCount }}</span>
        </div>
      </div>

      <!-- Category filters -->
      <div class="filter-area">
        <div class="category-bar">
          <button
            class="cat-pill"
            :class="{ active: selectedCategoryId === null }"
            @click="selectedCategoryId = null"
          >
            All
          </button>
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="cat-pill"
            :class="{ active: selectedCategoryId === cat.id }"
            @click="selectedCategoryId = cat.id"
          >
            {{ cat.name }}
          </button>
        </div>

        <div v-if="subCategories.length > 0" class="subcategory-bar">
          <button
            class="sub-pill"
            :class="{ active: selectedSubCategoryId === null }"
            @click="selectedSubCategoryId = null"
          >
            All
          </button>
          <button
            v-for="sub in subCategories"
            :key="sub.id"
            class="sub-pill"
            :class="{ active: selectedSubCategoryId === sub.id }"
            @click="selectedSubCategoryId = sub.id"
          >
            {{ sub.name }}
          </button>
        </div>
      </div>

      <!-- Results count -->
      <div class="results-bar">
        {{ filteredProducts.length }} products
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
              :src="p.image || 'https://dummyimage.com/300x300/1a1e28/c9a84c&text=No+Image'"
              :alt="p.name"
            />
            <div class="card-hover-overlay">
              <span class="plus-circle">+</span>
            </div>
          </div>

          <div class="card-info">
            <p class="card-name">{{ p.name }}</p>
            <div class="card-bottom">
              <span class="card-price">₹{{ p.items?.[0]?.price ?? 0 }}</span>
              <span v-if="p.items?.length > 1" class="card-variant-count">
                {{ p.items.length }} variants
              </span>
            </div>
          </div>
        </div>

        <div v-if="filteredProducts.length === 0" class="no-products">
          <span class="no-products-icon">◎</span>
          <p>No products found</p>
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
          <h2 class="cart-title">Current Order</h2>
          <span class="cart-count-badge">{{ cartCount }} items</span>
        </div>

        <div class="cart-body">
          <transition-group name="item-anim" tag="div" class="cart-list">
            <div v-for="item in cart" :key="item.id" class="cart-item">

              <div class="cart-item-info">
                <p class="cart-item-name">{{ item.name }}</p>
                <p class="cart-item-rate">
                  ₹{{ item.price }}
                  <span v-if="item.tax_rate > 0" class="cart-item-tax">+ {{ item.tax_rate }}% tax</span>
                </p>
              </div>

              <div class="cart-item-qty">
                <button class="qty-btn" @click="decreaseQty(item.id)">−</button>
                <span class="qty-value">{{ item.qty }}</span>
                <button class="qty-btn" @click="increaseQty(item.id)">+</button>
              </div>

              <div class="cart-item-total">
                <p class="cart-item-amount">₹{{ (item.price * item.qty).toFixed(2) }}</p>
                <button class="remove-btn" @click="removeFromCart(item.id)" title="Remove item">✕</button>
              </div>

            </div>
          </transition-group>
        </div>

        <!-- Bill summary -->
        <div class="bill-summary">
          <div class="bill-row">
            <span>Subtotal</span>
            <span>₹{{ cartTotals.subtotal.toFixed(2) }}</span>
          </div>

          <!-- Only show tax row if there is any tax -->
          <div v-if="cartTotals.totalTax > 0" class="bill-row tax-row">
            <span>Tax</span>
            <span>₹{{ cartTotals.totalTax.toFixed(2) }}</span>
          </div>

          <div class="bill-divider"></div>

          <div class="bill-row total-row">
            <span>Grand Total</span>
            <span>₹{{ cartTotals.grandTotal.toFixed(2) }}</span>
          </div>
        </div>

        <button class="checkout-btn" @click="checkout">
          Place Order · ₹{{ cartTotals.grandTotal.toFixed(2) }}
        </button>

      </aside>
    </transition>

    <!-- ═══════════════════════════════════════
         VARIANT DIALOG
    ════════════════════════════════════════ -->
    <v-dialog v-model="showVariantDialog" max-width="580">
      <div v-if="selectedProduct" class="dialog-card">

        <!-- Product hero with close button -->
        <div class="dialog-hero">
          <img
            :src="selectedProduct.image || 'https://dummyimage.com/580x200/0d0f14/c9a84c&text=' + encodeURIComponent(selectedProduct.name)"
            :alt="selectedProduct.name"
            class="dialog-hero-img"
          />
          <!-- Dark gradient so title text is readable -->
          <div class="dialog-hero-gradient"></div>
          <h3 class="dialog-product-name">{{ selectedProduct.name }}</h3>
          <button class="dialog-close-btn" @click="closeDialog" title="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="dialog-body">

          <p v-if="selectedProduct.description" class="dialog-description">
            {{ selectedProduct.description }}
          </p>

          <p class="dialog-section-label">Choose a variant</p>

          <p v-if="!selectedProduct.items?.length" class="dialog-no-variants">
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
              <!-- Left: name + stock -->
              <div class="variant-left">
                <p class="variant-name">{{ item.variant }}</p>
                <p
                  class="variant-stock"
                  :class="{
                    'stock-low': item.quantity > 0 && item.quantity < 5,
                    'stock-out': item.quantity === 0
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

              <!-- Right: price + checkmark -->
              <div class="variant-right">
                <span class="variant-price">₹{{ item.price }}</span>
                <span v-if="item.tax_rate > 0" class="variant-tax-badge">
                  {{ item.tax_rate }}% GST
                </span>
                <span v-if="selectedVariant?.id === item.id" class="variant-check">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <!-- Footer actions -->
          <div class="dialog-footer">

            <!-- Price preview -->
            <div class="dialog-price-preview">
              <span class="price-label">
                {{ selectedVariant ? 'Selected' : 'Pick a variant' }}
              </span>
              <span v-if="selectedVariant" class="price-value">
                ₹{{ selectedVariant.price }}
                <span v-if="selectedVariant.tax_rate > 0" class="price-tax-note">
                  + ₹{{ (selectedVariant.price * selectedVariant.tax_rate / 100).toFixed(2) }} tax
                </span>
              </span>
            </div>

            <!-- Buttons -->
            <div class="dialog-buttons">
              <button class="btn-cancel" @click="closeDialog">
                Cancel
              </button>
              <button
                class="btn-add"
                :disabled="!selectedVariant || selectedVariant.quantity === 0"
                @click="addSelectedToCart"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                Add to Cart
              </button>
            </div>

          </div>
        </div>
      </div>
    </v-dialog>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@600&display=swap');

/* ─── Design Tokens ─────────────────────────────────────── */
:root {
  --bg-base:        #0d0f14;
  --bg-surface:     #13161d;
  --bg-elevated:    #1a1e28;
  --bg-hover:       #21263a;

  --gold:           #c9a84c;
  --gold-hover:     #deba60;
  --gold-dim:       rgba(201, 168, 76, 0.13);
  --gold-border:    rgba(201, 168, 76, 0.28);

  --text-primary:   #f0ede6;
  --text-secondary: #8a8fa8;
  --text-muted:     #4e5366;

  --border-subtle:  rgba(255, 255, 255, 0.06);
  --border-mid:     rgba(255, 255, 255, 0.10);

  --red:            #e05c5c;
  --orange:         #e07c4c;
  --green:          #4eca8b;

  --radius-sm:      8px;
  --radius-md:      12px;
  --radius-lg:      18px;
  --radius-xl:      24px;

  --font-sans:      'DM Sans', sans-serif;
  --font-display:   'Playfair Display', serif;

  --transition:     0.2s ease;
}

/* ─── Reset ─────────────────────────────────────────────── */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

button {
  cursor: pointer;
  font-family: var(--font-sans);
  border: none;
  background: none;
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
  border-right: 1px solid var(--border-subtle);
  transition: flex 0.38s cubic-bezier(0.4, 0, 0.2, 1);
}

.products-panel.expanded {
  /* No cart visible — take up full width */
  border-right: none;
}

/* Top bar */
.top-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 15px 20px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.brand-mark {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
}

.brand-icon {
  font-size: 20px;
  color: var(--gold);
}

.brand-name {
  font-family: var(--font-display);
  font-size: 15px;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.search-wrapper {
  flex: 1;
  position: relative;
  max-width: 440px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 9px 14px 9px 36px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-sans);
  outline: none;
  transition: border-color var(--transition);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-input:focus {
  border-color: var(--gold-border);
}

/* Cart indicator in top bar */
.cart-indicator {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold-border);
  background: var(--gold-dim);
  color: var(--gold);
  flex-shrink: 0;
}

.indicator-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--gold);
  color: #0d0f14;
  font-size: 9px;
  font-weight: 700;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Category filters */
.filter-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 20px 8px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.category-bar,
.subcategory-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.category-bar::-webkit-scrollbar,
.subcategory-bar::-webkit-scrollbar {
  display: none;
}

.cat-pill,
.sub-pill {
  padding: 5px 15px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-family: var(--font-sans);
  white-space: nowrap;
  transition: all var(--transition);
}

.cat-pill:hover,
.sub-pill:hover {
  border-color: var(--gold-border);
  color: var(--gold);
}

.cat-pill.active,
.sub-pill.active {
  background: var(--gold-dim);
  border-color: var(--gold);
  color: var(--gold);
  font-weight: 500;
}

.sub-pill {
  font-size: 11.5px;
  padding: 4px 12px;
}

/* Results bar */
.results-bar {
  padding: 8px 20px;
  font-size: 10.5px;
  color: var(--text-muted);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  flex-shrink: 0;
}

/* Product grid */
.product-grid {
  flex: 1;
  overflow-y: auto;
  padding: 14px 20px 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
  gap: 14px;
  align-content: start;
  scrollbar-width: thin;
  scrollbar-color: var(--bg-hover) transparent;
}

.product-card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.product-card:hover {
  border-color: var(--gold-border);
  transform: translateY(-3px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
}

.card-image-wrap {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
}

.card-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.35s ease;
}

.product-card:hover .card-image-wrap img {
  transform: scale(1.06);
}

.card-hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition);
}

.product-card:hover .card-hover-overlay {
  opacity: 1;
}

.plus-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--gold);
  color: #0d0f14;
  font-size: 22px;
  font-weight: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.card-info {
  padding: 10px 12px 13px;
}

.card-name {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-price {
  font-size: 14px;
  font-weight: 600;
  color: var(--gold);
}

.card-variant-count {
  font-size: 10.5px;
  color: var(--text-muted);
  background: var(--bg-elevated);
  padding: 2px 6px;
  border-radius: 999px;
}

/* Empty state */
.no-products {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  gap: 10px;
  color: var(--text-muted);
}

.no-products-icon {
  font-size: 30px;
}

.no-products p {
  font-size: 14px;
}

/* ════════════════════════════════════════
   CART PANEL
   Slides in from right only when cart > 0
════════════════════════════════════════ */
.cart-panel {
  width: 355px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-subtle);
  overflow: hidden;
}

/* Slide transition */
.cart-slide-enter-active {
  transition: all 0.36s cubic-bezier(0.4, 0, 0.2, 1);
}

.cart-slide-leave-active {
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
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
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.cart-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.cart-count-badge {
  font-size: 11px;
  font-weight: 600;
  background: var(--gold);
  color: #0d0f14;
  padding: 3px 10px;
  border-radius: 999px;
}

/* Cart body / item list */
.cart-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  scrollbar-width: thin;
  scrollbar-color: var(--bg-hover) transparent;
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
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  transition: border-color var(--transition);
}

.cart-item:hover {
  border-color: var(--gold-border);
}

.cart-item-info {
  flex: 1;
  min-width: 0;
}

.cart-item-name {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.cart-item-rate {
  font-size: 11px;
  color: var(--text-muted);
}

.cart-item-tax {
  color: var(--text-muted);
  opacity: 0.7;
}

/* Qty controls */
.cart-item-qty {
  display: flex;
  align-items: center;
  gap: 6px;
}

.qty-btn {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid var(--border-mid);
  background: var(--bg-base);
  color: var(--text-primary);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: all var(--transition);
}

.qty-btn:hover {
  border-color: var(--gold);
  color: var(--gold);
}

.qty-value {
  font-size: 13px;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
  color: var(--text-primary);
}

/* Item total + remove */
.cart-item-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.cart-item-amount {
  font-size: 13px;
  font-weight: 600;
  color: var(--gold);
}

.remove-btn {
  font-size: 10px;
  color: var(--text-muted);
  transition: color var(--transition);
  padding: 0;
}

.remove-btn:hover {
  color: var(--red);
}

/* Item enter/leave animation */
.item-anim-enter-active,
.item-anim-leave-active {
  transition: all 0.2s ease;
}

.item-anim-enter-from {
  opacity: 0;
  transform: translateX(14px);
}

.item-anim-leave-to {
  opacity: 0;
  transform: translateX(-14px);
}

/* Bill summary */
.bill-summary {
  padding: 14px 18px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 9px;
  flex-shrink: 0;
}

.bill-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}

.bill-row.tax-row {
  font-size: 12px;
  color: var(--text-muted);
}

.bill-divider {
  height: 1px;
  background: var(--border-subtle);
}

.bill-row.total-row {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Checkout button */
.checkout-btn {
  margin: 0 14px 16px;
  padding: 14px;
  border-radius: var(--radius-md);
  border: none;
  background: linear-gradient(135deg, #c9a84c 0%, #e8c96a 50%, #c9a84c 100%);
  background-size: 200% 200%;
  color: #0d0f14;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-sans);
  letter-spacing: 0.02em;
  animation: shimmer 3s ease infinite;
  transition: transform var(--transition), box-shadow var(--transition);
  flex-shrink: 0;
}

.checkout-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(201, 168, 76, 0.26);
}

.checkout-btn:active {
  transform: translateY(0);
}

@keyframes shimmer {
  0%, 100% { background-position: 0% 50%; }
  50%       { background-position: 100% 50%; }
}

/* ════════════════════════════════════════
   VARIANT DIALOG
════════════════════════════════════════ */
.dialog-card {
  background: var(--bg-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--gold-border);
  overflow: hidden;
  font-family: var(--font-sans);
}

/* Hero image section */
.dialog-hero {
  position: relative;
  height: 185px;
  overflow: hidden;
}

.dialog-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.dialog-hero-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.28) 0%,
    transparent 40%,
    rgba(13, 15, 20, 0.88) 100%
  );
}

.dialog-product-name {
  position: absolute;
  bottom: 14px;
  left: 18px;
  right: 52px;
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
  line-height: 1.3;
}



.dialog-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;

  width: 36px;
  height: 36px;
  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;

  /* Glass + depth */
  background: rgba(20, 22, 28, 0.55);
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);

  border: 1px solid rgba(255, 255, 255, 0.08);

  /* Soft shadow for floating effect */
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.35),
    inset 0 0 0 0 rgba(255, 255, 255, 0);

  color: var(--text-primary);

  cursor: pointer;

  transition:
    transform 0.2s ease,
    background 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

/* Hover → subtle lift + glow */
.dialog-close-btn:hover {
  transform: translateY(-2px) scale(1.05);

  background: linear-gradient(
    135deg,
    rgba(255, 80, 80, 0.9),
    rgba(255, 40, 40, 0.9)
  );

  border-color: rgba(255, 80, 80, 0.8);

  box-shadow:
    0 8px 20px rgba(255, 60, 60, 0.35),
    0 0 0 2px rgba(255, 60, 60, 0.15);
}

/* Click → pressed feel */
.dialog-close-btn:active {
  transform: scale(0.92);
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.4) inset;
}

/* Icon styling (if using <i> or svg inside) */
.dialog-close-btn svg,
.dialog-close-btn i {
  font-size: 16px;
  transition: transform 0.2s ease;
}

/* Icon rotates slightly on hover (premium touch) */
.dialog-close-btn:hover svg,
.dialog-close-btn:hover i {
  transform: rotate(90deg);
}

/* Focus accessibility (important!) */
.dialog-close-btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px rgba(255, 60, 60, 0.4);
}

/* Dialog body */
.dialog-body {
  padding: 18px 20px 20px;
}

.dialog-description {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}

.dialog-section-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.dialog-no-variants {
  font-size: 13px;
  color: var(--text-muted);
  padding: 10px 0;
}

/* Variant rows */
.dialog-variants {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  max-height: 240px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--bg-hover) transparent;
}

.variant-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 15px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition);
}

.variant-row:hover:not(.variant-oos) {
  border-color: var(--gold-border);
  background: var(--bg-hover);
}

.variant-row.variant-selected {
  border-color: var(--gold);
  background: var(--gold-dim);
}

.variant-row.variant-oos {
  opacity: 0.45;
  cursor: not-allowed;
}

.variant-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.variant-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-primary);
}

.variant-stock {
  font-size: 11px;
  color: var(--text-muted);
}

.variant-stock.stock-low {
  color: var(--orange);
}

.variant-stock.stock-out {
  color: var(--red);
}

.variant-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.variant-price {
  font-size: 16px;
  font-weight: 600;
  color: var(--gold);
}

.variant-tax-badge {
  font-size: 10px;
  background: rgba(201, 168, 76, 0.12);
  color: var(--gold);
  border: 1px solid var(--gold-border);
  padding: 2px 7px;
  border-radius: 999px;
}

.variant-check {
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: var(--gold);
  color: #0d0f14;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Dialog footer */
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.dialog-price-preview {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.price-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}

.price-value {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  color: var(--gold);
  line-height: 1.2;
}

.price-tax-note {
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--text-muted);
  display: block;
  margin-top: 1px;
}

/* Cancel and Add buttons side by side */
.dialog-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.btn-cancel {
  padding: 11px 20px;
  border-radius: var(--radius-md);

  font-size: 13.5px;
  font-weight: 500;
  font-family: var(--font-sans);

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  /* Base */
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);

  cursor: pointer;

  /* Depth */
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.25),
    inset 0 0 0 0 rgba(255, 255, 255, 0);

  backdrop-filter: blur(6px);

  transition:
    transform 0.18s ease,
    background 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    color 0.25s ease;
}

/* Hover → subtle lift + soft red intent */
.btn-cancel:hover {
  transform: translateY(-1px);

  border-color: rgba(255, 90, 90, 0.6);
  color: #ff6b6b;

  background: linear-gradient(
    135deg,
    rgba(255, 90, 90, 0.08),
    rgba(255, 60, 60, 0.12)
  );

  box-shadow:
    0 6px 14px rgba(255, 60, 60, 0.15),
    0 0 0 1px rgba(255, 60, 60, 0.1);
}

/* Active → pressed feel */
.btn-cancel:active {
  transform: scale(0.96);

  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3) inset;
}

/* Focus (keyboard accessibility) */
.btn-cancel:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px rgba(255, 80, 80, 0.35);
}

/* Optional icon animation */
.btn-cancel svg,
.btn-cancel i {
  font-size: 14px;
  transition: transform 0.2s ease;
}

.btn-cancel:hover svg,
.btn-cancel:hover i {
  transform: translateX(2px);
}

/* Disabled state (important for UX) */
.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.btn-add {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  padding: 12px 22px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);

  background: linear-gradient(135deg, #d4af37, #c9a84c, #b8962e);
  color: #111;

  font-size: 13.5px;
  font-weight: 600;
  font-family: var(--font-sans);

  cursor: pointer;
  overflow: hidden;

  transition: all 0.25s ease;
}

/* ✨ Soft glow layer */
.btn-add::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;

  background: linear-gradient(
    120deg,
    rgba(255,255,255,0.4) 0%,
    transparent 40%,
    transparent 60%,
    rgba(255,255,255,0.4) 100%
  );

  opacity: 0;
  transition: opacity 0.25s ease;
}

/* 🌟 Shine animation */
.btn-add::after {
  content: "";
  position: absolute;
  top: 0;
  left: -120%;
  width: 100%;
  height: 100%;

  background: linear-gradient(
    120deg,
    transparent,
    rgba(255,255,255,0.5),
    transparent
  );

  transition: all 0.6s ease;
}

/* 🟡 Hover */
.btn-add:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.02);

  box-shadow:
    0 10px 30px rgba(201, 168, 76, 0.35),
    0 2px 6px rgba(0, 0, 0, 0.2);

  background: linear-gradient(135deg, #e0bb4a, #d4af37, #c9a84c);
}

/* glow visible */
.btn-add:hover::before {
  opacity: 1;
}

/* shine sweep */
.btn-add:hover::after {
  left: 120%;
}

/* 🔘 Click press */
.btn-add:active:not(:disabled) {
  transform: scale(0.96);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* 🚫 Disabled */
.btn-add:disabled {
  background: linear-gradient(135deg, #2a2d35, #1f2229);
  color: #777;
  cursor: not-allowed;
  box-shadow: none;
}

/* ─── Mobile ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .pos-root {
    flex-direction: column;
  }

  .cart-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    max-height: 50vh;
    border-radius: 20px 20px 0 0;
    border-top: 1px solid var(--gold-border);
    border-left: none;
    z-index: 100;
  }

  /* Override slide direction on mobile (comes up from bottom) */
  .cart-slide-enter-from,
  .cart-slide-leave-to {
    transform: translateY(100%);
    opacity: 1;
  }

  .products-panel {
    border-right: none;
  }

  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  }

  .dialog-variants {
    max-height: 180px;
  }

  .dialog-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .dialog-buttons {
    width: 100%;
    justify-content: stretch;
  }

  .btn-cancel,
  .btn-add {
    flex: 1;
    justify-content: center;
  }
}
</style>