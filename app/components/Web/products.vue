<template>
  <v-container fluid class="mobile-bg pa-4">
    <!-- HEADER -->
    <div class="d-flex justify-space-between align-center mb-4">
      <div>
        <h2 class="text-h5 font-weight-bold">Products</h2>
        <p class="text-body-2 text-grey">Manage all products & variants</p>
      </div>

      <v-btn color="primary" rounded="lg" class="px-6" @click="openAdd">
        <v-icon left>mdi-plus</v-icon>
        Add Product
      </v-btn>
    </div>

    <!-- FILTER CARD -->
    <v-card class="pa-4 mb-4" elevation="0" rounded="xl" style="border: 1px solid #eee;">
      <v-row dense>

        <!-- SEARCH -->
        <v-col cols="12" md="4">
          <v-text-field v-model="search" label="Search products" prepend-inner-icon="mdi-magnify" variant="solo-filled"
            density="comfortable" rounded="lg" hide-details clearable class="modern-input" />
        </v-col>

        <!-- CATEGORY -->
        <v-col cols="12" md="4">
          <v-select v-model="category_id" :items="categoryList" item-title="name" item-value="id" label="Category"
            prepend-inner-icon="mdi-shape" variant="solo-filled" density="comfortable" rounded="lg" clearable
            hide-details class="modern-input" />
        </v-col>

        <!-- SUBCATEGORY -->
        <v-col cols="12" md="4">
          <v-select v-model="sub_category_id" :items="filteredSubcategories" item-title="name" item-value="id"
            label="Subcategory" prepend-inner-icon="mdi-shape-outline" variant="solo-filled" density="comfortable"
            rounded="lg" clearable hide-details class="modern-input" />
        </v-col>

      </v-row>
    </v-card>

    <!-- PRODUCT TABLE -->
    <v-card rounded="xl" flat>
      <v-data-table :headers="headers" :items="normalizedProducts" item-key="id" show-expand expand-on-click
        class="elevation-0">

        <template #item.hsnCode="{ item }">
          {{ item?.hsn || '-' }}
        </template>

        <!-- ACTIONS (FIXED) -->
        <template #item.actions="{ item }">
          <v-menu>
            <template #activator="{ props }">
              <v-btn icon variant="text" v-bind="props">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>

            <v-list>
              <v-list-item @click="openEdit(item)">
                <v-list-item-title>Edit</v-list-item-title>
              </v-list-item>

              <v-list-item @click="openVariantDialog(item)">
                <v-list-item-title>Add Variant</v-list-item-title>
              </v-list-item>

              <v-list-item @click="removeProduct(item.id)">
                <v-list-item-title class="text-error">Delete</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>

        <!-- EXPANDED ROW -->
        <template #expanded-row="{ item }">
          <td :colspan="headers.length" class="pa-4">

            <v-card rounded="xl" class="pa-4 mb-2" elevation="0">
              <h3 class="text-subtitle-1 font-weight-bold mb-3">
                Variants ({{ item.variants.length }})
              </h3>

              <v-data-table :headers="variantHeaders" :items="item.variants" hide-default-footer class="elevation-0">
                <template #item.price="{ item }">
                  ₹{{ item.price }}
                </template>
              </v-data-table>
            </v-card>

          </td>
        </template>

      </v-data-table>
    </v-card>

    <!-- PRODUCT DIALOG -->
    <v-dialog v-model="productDialog" max-width="720px" persistent>
      <v-card class="rounded-xl pa-4" elevation="12">

        <!-- HEADER -->
        <div class="d-flex justify-space-between align-center mb-3">
          <h2 class="text-h6 font-weight-bold">
            {{ isEdit ? "Edit Product" : "Add Product" }}
          </h2>
          <v-btn icon variant="text" @click="productDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>

        <v-divider class="mb-4"></v-divider>

        <!-- FORM -->
        <v-form ref="formRef" v-model="formValid">

          <v-row>
            <v-col cols="12" md="6">
              <v-select label="Category" :items="categories" item-title="name" item-value="id" variant="solo-filled"
                rounded="lg" v-model="form.category_id" />

              <v-btn variant="text" color="primary" class="mt-1" prepend-icon="mdi-plus"
                @click="dialogCreateCategory = true">
                Add New Category
              </v-btn>
            </v-col>

            <v-col cols="12" md="6">
              <v-select label="Subcategory" :items="subcategoriesFiltered" item-title="name" item-value="id"
                variant="solo-filled" rounded="lg" :disabled="!form.category_id" v-model="form.sub_category_id" />

              <v-btn variant="text" color="primary" class="mt-1" prepend-icon="mdi-plus"
                @click="dialogCreateSubcategory = true" :disabled="!form.category_id">
                Add New Subcategory
              </v-btn>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field label="Product Name" v-model="form.name" variant="solo-filled" rounded="lg" />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field label="SKU" v-model="form.sku" variant="solo-filled" rounded="lg" />
            </v-col>
          </v-row>

        </v-form>

        <v-divider class="my-4"></v-divider>

        <!-- FOOTER -->
        <div class="d-flex justify-end ga-2">
          <v-btn variant="tonal" rounded="lg" @click="productDialog = false">Cancel</v-btn>
          <v-btn color="primary" rounded="lg" @click="submitProduct">
            Save Product
          </v-btn>
        </div>

      </v-card>
    </v-dialog>

    <v-dialog v-model="variantDialog" max-width="600px">
      <v-card class="rounded-xl pa-4">
        <div class="d-flex justify-space-between align-center mb-3">
          <h2 class="text-h6 font-weight-bold">
            {{ variantEdit ? "Edit Variant" : "Add Variant" }}
          </h2>
          <v-btn icon @click="variantDialog = false"><v-icon>mdi-close</v-icon></v-btn>
        </div>

        <v-divider class="mb-4"></v-divider>

        <v-form ref="variantFormRef" v-model="variantFormValid">
          <v-text-field label="Variant Name" v-model="variantForm.variant" variant="solo-filled" rounded="lg" />
          <v-text-field label="SKU" v-model="variantForm.sku" variant="solo-filled" rounded="lg" />
          <v-text-field label="Price" type="number" v-model.number="variantForm.price" variant="solo-filled"
            rounded="lg" />
          <v-text-field label="MRP" type="number" v-model.number="variantForm.mrp" variant="solo-filled" rounded="lg" />
          <v-text-field label="Quantity" type="number" v-model.number="variantForm.quantity" variant="solo-filled"
            rounded="lg" />
        </v-form>

        <v-divider class="my-4"></v-divider>

        <div class="d-flex justify-end ga-2">
          <v-btn variant="tonal" rounded="lg" @click="variantDialog = false">Cancel</v-btn>
          <v-btn color="primary" rounded="lg" @click="submitVariant">Save</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- CATEGORY CREATE DIALOG -->
    <v-dialog v-model="dialogCreateCategory" max-width="420px">
      <v-card class="pa-5 rounded-xl">
        <div class="d-flex align-center mb-3">
          <v-icon color="primary" size="28">mdi-shape-plus</v-icon>
          <span class="text-h6 font-weight-bold ml-2">Create Category</span>
        </div>

        <v-text-field v-model="newCategoryName" label="Category Name" variant="solo" rounded="lg"
          prepend-inner-icon="mdi-tag-outline" class="mb-4" />

        <v-divider class="my-4"></v-divider>

        <div class="text-right">
          <v-btn class="mr-2" variant="text" @click="dialogCreateCategory = false">Cancel</v-btn>
          <v-btn color="primary" rounded="lg" @click="saveNewCategory">Save</v-btn>
        </div>
      </v-card>
    </v-dialog>


    <!-- SUBCATEGORY CREATE DIALOG -->
    <v-dialog v-model="dialogCreateSubcategory" max-width="420px">
      <v-card class="pa-5 rounded-xl">
        <div class="d-flex align-center mb-3">
          <v-icon color="primary" size="28">mdi-shape-outline</v-icon>
          <span class="text-h6 font-weight-bold ml-2">Create Subcategory</span>
        </div>

        <v-text-field v-model="newSubcategoryName" label="Subcategory Name" variant="solo" rounded="lg"
          prepend-inner-icon="mdi-tag-multiple-outline" class="mb-4" />

        <v-divider class="my-4"></v-divider>

        <div class="text-right">
          <v-btn class="mr-2" variant="text" @click="dialogCreateSubcategory = false">Cancel</v-btn>
          <v-btn color="primary" rounded="lg" @click="saveNewSubcategory">Save</v-btn>
        </div>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue"
import { useProducts } from "@/composables/pos/useProducts"
import { useCategories } from "@/composables/pos/useCategories"

const COMPANY_ID = "LOCAL_COMPANY"

const { listProducts, createProduct, updateProduct, fetchCategories, createCategory, createSubCategory, createVariant, updateVariant, deleteProduct } = useProducts()
const { getCategories } = useCategories()

const products = ref<any[]>([])
const categories = ref<any[]>([])
const category = ref<any[]>([])
const search = ref("")
const selectedCategory = ref<number | null>(null)

const categoryName = ref("");
const parentCategory = ref(null);
const subCategoryName = ref("");

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

const dialogCreateCategory = ref(false);
const dialogCreateSubcategory = ref(false);

const newCategoryName = ref("");
const newSubcategoryName = ref("");

const subcategoriesFiltered = computed(() =>
  category.value.filter(c => c.parent_id === form.value.category_id)
);

let currentProduct: any = null

const headers = [
  { title: "Name", key: "productName" },
  { title: "SKU", key: "sku" },
  { title: "Description", key: "description" },
  { title: "Category", key: "category" },
  { title: "Subcategory", key: "subcategory" },
  { title: "HSN", key: "hsnCode" },
  { title: "Variants", key: "variantCount", align: "center" },
  { title: "Actions", key: "actions", sortable: false, align: "end" },
];

const variantHeaders = [
  { title: "Variant", key: "variant" },
  { title: "SKU", key: "sku" },
  { title: "Price", key: "price" },
  { title: "MRP", key: "mrp" },
  { title: "Qty", key: "quantity" },
];

/* 🔥 FIX FOR FILTER SECTION VALUES 🔥 */

// Filter category & subcategory
const category_id = ref(null);
const sub_category_id = ref(null);

// Category list for filters (top filter card)
const categoryList = ref<any[]>([]);
const subcategoryList = ref<any[]>([]);

// Filtered subcategories based on parent selection
const filteredSubcategories = computed(() => {
  if (!category_id.value) return [];
  return subcategoryList.value.filter(
    (s) => Number(s.parent_id) === Number(category_id.value)
  );
});

const normalizedProducts = computed(() =>
  products.value.map((p) => ({
    ...p,
    productName: p.name,
    variantCount: p.items?.length || 0,
    variants: p.items || [],

    category: categoryMap.value[p.category_id] || "-",
    subcategory: subcategoryMap.value[p.sub_category_id] || "-",
  }))
)

onMounted(async () => {
  category.value = await fetchCategories(COMPANY_ID) || [];

  categories.value = await getCategories({ company_id: COMPANY_ID, parent_id: null }) || [];

  categoryList.value = categories.value;

  subcategoryList.value = category.value.filter(c => c.parent_id !== null);

  products.value = await listProducts({ company_id: COMPANY_ID }) || [];
});

const categoryMap = computed(() =>
  Object.fromEntries(category.value
    .filter(c => c.parent_id === null)
    .map(c => [c.id, c.name])
  )
)

const subcategoryMap = computed(() =>
  Object.fromEntries(category.value
    .filter(c => c.parent_id !== null)
    .map(c => [c.id, c.name])
  )
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
  form.value = { name: "", sku: "", category_id: null }
  productDialog.value = true
}

const openEdit = (p: any) => {
  isEdit.value = true
  form.value = { ...p }
  productDialog.value = true
}

function onCategorySelect(val: any) {
  if (val === "add_category") {
    form.value.category_id = null;
    dialogCreateCategory.value = true;
    return;
  }

  form.value.category_id = val;
  form.value.sub_category_id = null;
}

function onSubcategorySelect(val: any) {
  if (val === "add_subcategory") {
    form.value.sub_category_id = null;
    dialogCreateSubcategory.value = true;
    return;
  }

  form.value.sub_category_id = val;
}

function openCategoryDialog() {
  newCategoryName.value = "";
  dialogCreateCategory.value = true;
}

async function saveNewCategory() {
  if (!newCategoryName.value.trim()) return;

  const id = await createCategory({
    name: newCategoryName.value,
    company_id: COMPANY_ID,
    parent_id: null
  });

  await refreshCategories();
  form.value.category_id = id;

  dialogCreateCategory.value = false;
}

function openSubcategoryDialog() {
  newSubcategoryName.value = "";
  dialogCreateSubcategory.value = true;
}

async function saveNewSubcategory() {
  if (!newSubcategoryName.value.trim()) return;
  if (!form.value.category_id) return;

  const id = await createSubCategory({
    name: newSubcategoryName.value,
    company_id: COMPANY_ID,
    parent_id: form.value.category_id
  });

  await refreshCategories();
  form.value.sub_category_id = id;

  dialogCreateSubcategory.value = false;
}

watch(() => form.value.category_id, () => {
  form.value.sub_category_id = null;
});

async function refreshCategories() {
  category.value = await fetchCategories(COMPANY_ID);
  categories.value = await getCategories({ company_id: COMPANY_ID, parent_id: null }) || []
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
  variantForm.value = variant ? { ...variant } : { variant: "", sku: "", price: 0, mrp: 0, quantity: 0 }
  variantDialog.value = true
}

const submitVariant = async () => {
  const payload = {
    ...variantForm.value,
    company_id: COMPANY_ID,
  };

  if (variantEdit.value) {
    // UPDATE VARIANT
    await updateVariant(variantForm.value.id, payload);
  } else {
    // CREATE NEW VARIANT
    await createVariant(currentProduct.id, payload);
  }

  variantDialog.value = false;

  // Refresh product list
  products.value = await listProducts({ company_id: COMPANY_ID });
};

// SAVE CATEGORY / SUBCATEGORY
async function handleSave() {
  if (!categoryName.value) {
    alert("Enter category name");
    return;
  }

  // 1️⃣ Create main category first
  const mainCatId = await createCategory(categoryName.value);

  // 2️⃣ If user selected parent → treat this as creating a subcategory
  if (parentCategory.value && subCategoryName.value) {
    await createSubCategory(parentCategory.value, subCategoryName.value);
  }

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

.select-btn-align .v-btn {
  height: 56px !important;
  width: 56px !important;
  border-radius: 12px;
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

.modern-input .v-field {
  border-radius: 14px !important;
  background: #fafafa !important;
  border: 1px solid #e6e6e6 !important;
  transition: 0.25s ease-in-out;
}

.modern-input .v-field:hover {
  border-color: #c4c4c4 !important;
}

.modern-input .v-field--focused {
  border-color: #3f51b5 !important;
  /* Indigo */
  box-shadow: 0 0 0 2px rgba(63, 81, 181, 0.15) !important;
}
</style>
