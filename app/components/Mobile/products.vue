<template>
  <v-container fluid class="mobile-bg pa-4">

    <!-- PRODUCT SUMMARY -->
    <v-card class="product-summary mb-4 pa-3" rounded="xl" elevation="0">
      <div class="d-flex justify-space-between align-center">
        <div>
          <div class="text-caption text-grey">Total Products</div>
          <div class="text-h5 font-weight-bold">{{ filteredProducts.length }}</div>
        </div>
        <v-icon size="36" color="primary">mdi-package-variant</v-icon>
      </div>
    </v-card>

    <!-- SEARCH -->
    <v-text-field
      v-model="search"
      placeholder="Search products"
      prepend-inner-icon="mdi-magnify"
      variant="solo"
      rounded="xl"
      hide-details
      density="comfortable"
      class="mb-4"
    />

    <!-- CATEGORY TABS -->
    <v-tabs
      v-model="selectedCategory"
      grow
      density="comfortable"
      class="mb-4 category-tabs"
    >
      <v-tab :value="null">All</v-tab>
      <v-tab v-for="cat in categories" :key="cat.id" :value="cat.id">
        {{ cat.name }}
      </v-tab>
    </v-tabs>

    <!-- PRODUCTS -->
    <v-row dense>
      <v-col cols="12" v-for="product in filteredProducts" :key="product.id">
        <v-card class="product-card mb-4" rounded="xl" elevation="0">

          <!-- HEADER -->
          <div class="card-top">
            <div>
              <div class="product-name">{{ product.name }}</div>
              <div class="product-sku">{{ product.sku || "No SKU" }}</div>
            </div>

            <v-menu>
              <template #activator="{ props }">
                <v-btn icon size="small" v-bind="props">
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item @click="openEdit(product)">Edit</v-list-item>
                <v-list-item class="text-red" @click="removeProduct(product.id)">
                  Delete
                </v-list-item>
              </v-list>
            </v-menu>
          </div>

          <!-- PRICE -->
          <div class="price-bar">
            <div>
              <div class="price">₹{{ product.price }}</div>
              <div class="mrp">MRP ₹{{ product.mrp || "-" }}</div>
            </div>

            <v-chip
              size="small"
              :color="(product.stock ?? 0) > 0 ? 'green' : 'red'"
            >
              {{ (product.stock ?? 0) > 0 ? "In Stock" : "Out of Stock" }}
            </v-chip>
          </div>

          <!-- META -->
          <div class="meta">
            Category:
            <strong>{{ categoryMap[product.category_id] || "N/A" }}</strong>
          </div>

          <!-- VARIANTS -->
          <v-expansion-panels flat class="variant-expansion">
            <v-expansion-panel>
              <v-expansion-panel-title>
                Variants ({{ product.items?.length || 0 }})
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list dense>
                  <v-list-item v-for="variant in product.items" :key="variant.id">
                    <v-list-item-content>
                      <v-list-item-title>{{ variant.variant || "Default" }}</v-list-item-title>
                      <v-list-item-subtitle>
                        SKU: {{ variant.sku || "-" }} • ₹{{ variant.price ?? product.price }} • Qty {{ variant.quantity ?? 0 }}
                      </v-list-item-subtitle>
                    </v-list-item-content>
                    <template #append>
                      <v-btn icon size="x-small" @click="openVariantDialog(product, variant)">
                        <v-icon size="16">mdi-pencil</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>

                  <v-btn
                    block
                    rounded="xl"
                    variant="tonal"
                    color="primary"
                    class="mt-2"
                    @click="openVariantDialog(product)"
                  >
                    + Add Variant
                  </v-btn>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

        </v-card>
      </v-col>
    </v-row>

    <!-- EMPTY -->
    <v-card
      v-if="!filteredProducts.length"
      rounded="xl"
      elevation="0"
      class="pa-6 text-center"
    >
      <v-icon size="48" color="grey">mdi-package-variant</v-icon>
      <div class="text-subtitle-1 mt-2">No products yet</div>
      <v-btn color="primary" rounded="xl" class="mt-3" @click="openAdd">
        Add Product
      </v-btn>
    </v-card>

    <!-- FAB -->
    <v-btn class="fab-rich" icon color="primary" size="large" @click="openAdd">
      <v-icon>mdi-plus</v-icon>
    </v-btn>

    <!-- PRODUCT DIALOG -->
    <v-dialog v-model="productDialog" fullscreen transition="dialog-bottom-transition">
      <v-card>
        <v-toolbar flat>
          <v-btn icon @click="productDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title>{{ isEdit ? "Edit Product" : "Add Product" }}</v-toolbar-title>
          <v-spacer />
          <v-btn color="primary" @click="submitProduct">Save</v-btn>
        </v-toolbar>

        <v-card-text>
          <v-form ref="formRef" v-model="formValid">
            <v-text-field label="Name" v-model="form.name" />
            <v-text-field label="SKU" v-model="form.sku" />
            <v-text-field label="Price" type="number" v-model.number="form.price" />
            <v-text-field label="MRP" type="number" v-model.number="form.mrp" />
            <v-select
              label="Category"
              :items="categories"
              item-title="name"
              item-value="id"
              v-model="form.category_id"
            />
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- VARIANT DIALOG -->
    <v-dialog v-model="variantDialog" fullscreen transition="dialog-bottom-transition">
      <v-card>
        <v-toolbar flat>
          <v-btn icon @click="variantDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title>{{ variantEdit ? "Edit Variant" : "Add Variant" }}</v-toolbar-title>
          <v-spacer />
          <v-btn color="primary" @click="submitVariant">Save</v-btn>
        </v-toolbar>

        <v-card-text>
          <v-form ref="variantFormRef" v-model="variantFormValid">
            <v-text-field label="Variant Name" v-model="variantForm.variant" />
            <v-text-field label="SKU" v-model="variantForm.sku" />
            <v-text-field label="Price" type="number" v-model.number="variantForm.price" />
            <v-text-field label="MRP" type="number" v-model.number="variantForm.mrp" />
            <v-text-field label="Quantity" type="number" v-model.number="variantForm.quantity" />
            <v-text-field label="Location" v-model="variantForm.location" />
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useProducts } from "@/composables/pos/useProducts"
import { useCategories } from "@/composables/pos/useCategories"

const COMPANY_ID = "LOCAL_COMPANY"

const { listProducts, createProduct, updateProduct, deleteProduct } = useProducts()
const { getCategories } = useCategories()

const products = ref<any[]>([])
const categories = ref<any[]>([])
const search = ref("")
const selectedCategory = ref<number | null>(null)

const productDialog = ref(false)
const variantDialog = ref(false)
const isEdit = ref(false)
const variantEdit = ref(false)

const form = ref<any>({})
const variantForm = ref<any>({})
const formRef = ref()
const variantFormRef = ref()
const formValid = ref(false)
const variantFormValid = ref(false)

let currentProduct: any = null

onMounted(async () => {
  categories.value = await getCategories({ company_id: COMPANY_ID, parent_id: null }) || []
  products.value = await listProducts({ company_id: COMPANY_ID }) || []
})

const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map(c => [c.id, c.name]))
)

const filteredProducts = computed(() =>
  products.value.filter(p => {
    const s = !search.value || p.name.toLowerCase().includes(search.value.toLowerCase())
    const c = selectedCategory.value === null || Number(p.category_id) === Number(selectedCategory.value)
    return s && c
  })
)

const openAdd = () => {
  isEdit.value = false
  form.value = { name: "", sku: "", price: 0, mrp: 0, category_id: null }
  productDialog.value = true
}

const openEdit = (p: any) => {
  isEdit.value = true
  form.value = { ...p }
  productDialog.value = true
}

const submitProduct = async () => {
  const payload = { ...form.value, company_id: COMPANY_ID }
  isEdit.value ? await updateProduct(form.value.id, payload) : await createProduct(payload)
  productDialog.value = false
  products.value = await listProducts({ company_id: COMPANY_ID }) || []
}

const removeProduct = async (id: string) => {
  if (!confirm("Delete product?")) return
  await deleteProduct(id)
  products.value = await listProducts({ company_id: COMPANY_ID }) || []
}

const openVariantDialog = (product: any, variant: any = null) => {
  currentProduct = product
  if (!currentProduct.items) currentProduct.items = []
  variantEdit.value = !!variant
  variantForm.value = variant ? { ...variant } : { variant: "", sku: "", price: 0, mrp: 0, quantity: 0, location: "" }
  variantDialog.value = true
}

const submitVariant = () => {
  if (variantEdit.value) {
    const i = currentProduct.items.findIndex((v: any) => v.id === variantForm.value.id)
    if (i >= 0) currentProduct.items[i] = { ...variantForm.value }
  } else {
    currentProduct.items.push({ ...variantForm.value, id: crypto.randomUUID() })
  }
  variantDialog.value = false
}
</script>

<style scoped>
.mobile-bg {
  background: linear-gradient(180deg, #f8fafc, #eef2ff);
  min-height: 100vh;
}

.product-summary {
  background: linear-gradient(135deg, #eef2ff, #ffffff);
  border: 1px solid #e5e7eb;
}

.product-card {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.05);
  border-radius: 16px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  padding: 16px;
}

.product-name {
  font-weight: 600;
  font-size: 16px;
}

.product-sku {
  font-size: 12px;
  color: #6b7280;
}

.price-bar {
  display: flex;
  justify-content: space-between;
  padding: 0 16px 8px;
}

.price {
  font-size: 20px;
  font-weight: 700;
  color: #4f46e5;
}

.mrp {
  font-size: 12px;
  color: #9ca3af;
}

.meta {
  padding: 0 16px 8px;
  font-size: 12px;
  color: #6b7280;
}

.fab-rich {
  position: fixed;
  bottom: 72px;
  right: 16px;
  border-radius: 50%;
  box-shadow: 0 12px 30px rgba(79, 70, 229, 0.4);
}

/* VARIANTS */
.variant-expansion .v-expansion-panel-header {
  font-size: 13px;
  font-weight: 600;
  color: #4f46e5;
}

.v-list-item {
  border-radius: 12px;
  margin-bottom: 6px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}
</style>
