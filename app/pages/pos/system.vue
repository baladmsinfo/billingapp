<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useProducts } from '@/composables/pos/useProducts'
import { useCategories } from '@/composables/pos/useCategories'

const COMPANY_ID = 'LOCAL_COMPANY'

const categories = ref<any[]>([])
const subCategories = ref<any[]>([])

const selectedCategoryId = ref<string | null>(null)
const selectedSubCategoryId = ref<string | null>(null)

const searchQuery = ref('')
const products = ref<any[]>([])
const cart = ref<any[]>([])

const selectedProduct = ref<any>(null)
const showVariantDialog = ref(false)

const { listProducts } = useProducts()
const { getCategories } = useCategories()

onMounted(async () => {
  categories.value =
    (await getCategories({ company_id: COMPANY_ID, parent_id: null })) || []

  products.value =
    (await listProducts({ company_id: COMPANY_ID })) || []
})

watch(selectedCategoryId, async (catId) => {
  selectedSubCategoryId.value = null
  if (!catId) return (subCategories.value = [])

  subCategories.value =
    (await getCategories({ company_id: COMPANY_ID, parent_id: catId })) || []
})

const filteredProducts = computed(() =>
  products.value.filter(p => {
    return (
      (!selectedCategoryId.value || p.category_id === selectedCategoryId.value) &&
      (!selectedSubCategoryId.value || p.sub_category_id === selectedSubCategoryId.value) &&
      (!searchQuery.value || p.name?.toLowerCase().includes(searchQuery.value.toLowerCase()))
    )
  })
)

const subtotal = computed(() =>
  cart.value.reduce((s, i) => s + i.price * i.qty, 0)
)

const gstAmount = computed(() => subtotal.value * 0.18)
const grandTotal = computed(() => subtotal.value + gstAmount.value)

const openProduct = (product: any) => {
  selectedProduct.value = product
  showVariantDialog.value = true
}

const addToCart = (item: any) => {
  const existing = cart.value.find(c => c.id === item.id)
  if (existing) existing.qty++
  else cart.value.push({
    id: item.id,
    name: item.variant || item.name,
    price: Number(item.price),
    qty: 1,
  })
}

const incQty = (id: string) => {
  const item = cart.value.find(i => i.id === id)
  if (item) item.qty++
}

const decQty = (id: string) => {
  const item = cart.value.find(i => i.id === id)
  if (item && item.qty > 1) item.qty--
}

const removeItem = (id: string) => {
  cart.value = cart.value.filter(i => i.id !== id)
}

const checkout = () => {
  alert(`Checkout Amount: ₹${grandTotal.value.toFixed(2)}`)
}
</script>


<template>
  <div class="pos-root">

    <!-- PRODUCTS -->
    <section class="products">

      <!-- CATEGORY -->
      <div class="category-bar">
        <div class="chip" :class="{ active: !selectedCategoryId }" @click="selectedCategoryId = null">
          All
        </div>
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="chip"
          :class="{ active: selectedCategoryId === cat.id }"
          @click="selectedCategoryId = cat.id"
        >
          {{ cat.name }}
        </div>
      </div>

      <!-- SUB CATEGORY -->
      <div v-if="subCategories.length" class="subcategory-bar">
        <div class="subchip" :class="{ active: !selectedSubCategoryId }" @click="selectedSubCategoryId = null">
          All
        </div>
        <div
          v-for="sub in subCategories"
          :key="sub.id"
          class="subchip"
          :class="{ active: selectedSubCategoryId === sub.id }"
          @click="selectedSubCategoryId = sub.id"
        >
          {{ sub.name }}
        </div>
      </div>

      <!-- SEARCH -->
      <input class="search" v-model="searchQuery" placeholder="Search products…" />

      <!-- PRODUCT GRID -->
      <div class="grid">
        <div
          v-for="p in filteredProducts"
          :key="p.id"
          class="product-card"
          @click="openProduct(p)"
        >
          <img
            :src="p.image || '/no-image.png'"
          />
          <div class="name">{{ p.name }}</div>
          <div class="price">₹{{ p.price }}</div>
        </div>
      </div>
    </section>

    <!-- CART -->
    <aside class="cart">
      <h3>Cart</h3>

      <div class="cart-list">
        <div v-if="!cart.length" class="empty">No items added</div>

        <div v-for="item in cart" :key="item.id" class="cart-item">
          <div class="left">
            <div class="title">{{ item.name }}</div>
            <div class="unit">₹{{ item.price }} × {{ item.qty }}</div>
          </div>

          <div class="center">
            <button @click="decQty(item.id)">−</button>
            <span>{{ item.qty }}</span>
            <button @click="incQty(item.id)">+</button>
          </div>

          <div class="right">
            ₹{{ (item.price * item.qty).toFixed(2) }}
            <button class="remove" @click="removeItem(item.id)">✕</button>
          </div>
        </div>
      </div>

      <div class="summary">
        <div><span>Subtotal</span><span>₹{{ subtotal.toFixed(2) }}</span></div>
        <div><span>GST</span><span>₹{{ gstAmount.toFixed(2) }}</span></div>
        <div class="grand"><span>Total</span><span>₹{{ grandTotal.toFixed(2) }}</span></div>
      </div>

      <button class="checkout" :disabled="!cart.length" @click="checkout">
        Checkout
      </button>
    </aside>

    <!-- VARIANT MODAL -->
    <v-dialog v-model="showVariantDialog" max-width="600">
      <v-card class="pa-4">
        <h3>{{ selectedProduct?.name }}</h3>

        <div v-if="!selectedProduct?.items?.length" class="empty">
          No variants
        </div>

        <div v-for="item in selectedProduct?.items || []" :key="item.id" class="variant">
          <div>
            <strong>{{ item.variant }}</strong>
            <div>₹{{ item.price }}</div>
            <small>Stock: {{ item.quantity }}</small>
          </div>

          <v-btn size="small" color="primary" @click="addToCart(item)">
            Add
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

  </div>
</template>



<style scoped>
/* ================= ROOT ================= */
.subcategory-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-top: 6px;
}

.subchip {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid #7e57c2;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
}

.subchip.active {
  background: #7e57c2;
  color: white;
}

.pos-root {
  display: flex;
  height: 90vh;
  overflow: hidden;
}

/* ================= PRODUCTS ================= */
.products {
  flex: 1;
  padding: 14px;
  display: flex;
  flex-direction: column;
}

.category-bar {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.chip {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid #1976d2;
  cursor: pointer;
  white-space: nowrap;
}

.chip.active {
  background: #1976d2;
  color: white;
}

.search {
  margin: 12px 0;
  padding: 12px;
  border-radius: 999px;
  border: 1px solid #ccc;
}

.grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill,minmax(150px,1fr));
  gap: 14px;
}

.product-card {
  background: white;
  border-radius: 14px;
  padding: 10px;
  box-shadow: 0 6px 16px rgba(0,0,0,.12);
  cursor: pointer;
  text-align: center;
}

.product-card img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 10px;
}

/* ================= CART ================= */
.cart {
  width: 360px;
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  margin: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
}

.cart-list {
  flex: 1;
  overflow-y: auto;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f7f9ff;
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 10px;
}

.qty button {
  width: 26px;
  height: 26px;
}

.remove {
  background: none;
  border: none;
  color: red;
}

.summary {
  border-top: 1px dashed #ccc;
  padding-top: 10px;
}

.summary div {
  display: flex;
  justify-content: space-between;
}

.summary .grand {
  font-weight: 700;
}

.checkout {
  margin-top: 10px;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(90deg,#2ecc71,#27ae60);
  color: white;
  font-weight: 700;
}

/* ================= MOBILE ================= */
@media (max-width: 768px) {
  .pos-root {
    flex-direction: column;
  }

  .cart {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    max-height: 50vh;
    border-radius: 16px 16px 0 0;
    margin: 0;
  }

  .products {
    padding-bottom: 52vh;
  }
}
</style>
