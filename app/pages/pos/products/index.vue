<template>
  <v-container fluid>
    <!-- HEADER -->
    <v-row align="center" class="mb-3">
      <v-col cols="6">
        <h2>Products</h2>
      </v-col>
      <v-col cols="6" class="text-right">
        <v-btn color="primary" @click="openAdd">Add Product</v-btn>
      </v-col>
    </v-row>

    <!-- FILTERS -->
    <v-row class="mb-3">
      <v-col cols="6">
        <v-text-field label="Search product" v-model="search" clearable />
      </v-col>
      <v-col cols="6">
        <v-select
          label="Category"
          :items="categories"
          item-title="name"
          item-value="id"
          v-model="selectedCategory"
          clearable
        />
      </v-col>
    </v-row>

    <!-- PRODUCTS TABLE -->
    <v-data-table
      :sort-desc.sync="sortAsc"
      :headers="headers"
      :items="filteredProducts"
      item-value="id"
      show-expand
      class="elevation-1"
      :loading="loading"
    >
      <template #item.name="{ item }">
        <strong>{{ item.name }}</strong>
        <div class="text-caption text-grey">SKU: {{ item.sku || "-" }}</div>
      </template>

      <template #item.price="{ item }">₹{{ item.price }}</template>
      <template #item.stock="{ item }">
        <v-chip :color="item.stock > 0 ? 'green' : 'red'" size="small">{{
          item.stock
        }}</v-chip>
      </template>

      <template #item.category_id="{ item }">
        {{ categoryMap[item.category_id] || "N/A" }}
      </template>

      <template #item.actions="{ item }">
        <v-btn icon size="small" @click="openEdit(item)">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <v-btn icon size="small" color="red" @click="removeProduct(item.id)">
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </template>

      <!-- EXPANDED ROW -->
      <template #expanded-row="{ item }">
        <td :colspan="headers.length">
          <v-card flat class="ma-2 pa-2">
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>MRP</th>
                  <th>Qty</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="variant in item.items" :key="variant.id">
                  <td>{{ variant.variant || "Default" }}</td>
                  <td>{{ variant.sku || "-" }}</td>
                  <td>₹{{ variant.price ?? item.price }}</td>
                  <td>₹{{ variant.mrp ?? item.mrp ?? "-" }}</td>
                  <td>{{ variant.quantity ?? 0 }}</td>
                  <td>{{ variant.location || "-" }}</td>
                  <td>
                    <v-btn icon size="x-small" variant="text" @click="openVariantDialog(item, variant)">
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn
                      variant="text"
                      icon
                      size="x-small"
                      color="red"
                      @click="deleteVariant(item, variant.id)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </td>
                </tr>
                <tr v-if="!item.items?.length">
                  <td colspan="7" class="text-center text-grey">No variants</td>
                </tr>
              </tbody>
            </v-table>
            <v-btn
              small
              color="primary"
              class="mt-2"
              @click="openVariantDialog(item)"
              >Add Variant</v-btn
            >
          </v-card>
        </td>
      </template>

      <template #no-data>
        <v-alert type="info">No products found</v-alert>
      </template>
    </v-data-table>

    <!-- PRODUCT DIALOG -->
    <v-dialog v-model="productDialog" max-width="500px">
      <v-card>
        <v-card-title>{{
          isEdit ? "Edit Product" : "Add Product"
        }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef" v-model="formValid">
            <v-text-field
              label="Name"
              v-model="form.name"
              :rules="[(v) => !!v || 'Required']"
            />
            <v-text-field label="SKU" v-model="form.sku" />
            <v-text-field
              label="Price"
              type="number"
              v-model.number="form.price"
            />
            <v-text-field label="MRP" type="number" v-model.number="form.mrp" />
            <v-select
              label="Category"
              :items="categories"
              item-title="name"
              item-value="id"
              v-model="form.category_id"
              clearable
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="productDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitProduct">{{
            isEdit ? "Update" : "Add"
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- VARIANT DIALOG -->
    <v-dialog v-model="variantDialog" max-width="500px">
      <v-card>
        <v-card-title>{{
          variantEdit ? "Edit Variant" : "Add Variant"
        }}</v-card-title>
        <v-card-text>
          <v-form ref="variantFormRef" v-model="variantFormValid">
            <v-text-field label="Variant Name" v-model="variantForm.variant" />
            <v-text-field label="SKU" v-model="variantForm.sku" />
            <v-text-field
              label="Price"
              type="number"
              v-model.number="variantForm.price"
            />
            <v-text-field
              label="MRP"
              type="number"
              v-model.number="variantForm.mrp"
            />
            <v-text-field
              label="Quantity"
              type="number"
              v-model.number="variantForm.quantity"
            />
            <v-text-field label="Location" v-model="variantForm.location" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="variantDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitVariant">{{
            variantEdit ? "Update" : "Add"
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useProducts } from "@/composables/pos/useProducts";
import { useCategories } from "@/composables/pos/useCategories";

const COMPANY_ID = "LOCAL_COMPANY";

const { listProducts, createProduct, updateProduct, deleteProduct } =
  useProducts();
const { getCategories } = useCategories();

const sortDesc = ref<boolean[]>([true]); // descending for latest first

const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const loading = ref(false);

/* PRODUCT DIALOG STATE */
const productDialog = ref(false);
const isEdit = ref(false);
const formValid = ref(false);
const formRef = ref();
const form = ref<any>({
  id: null,
  name: "",
  sku: "",
  price: 0,
  mrp: 0,
  category_id: null,
});

/* VARIANT DIALOG STATE */
const variantDialog = ref(false);
const variantEdit = ref(false);
const variantFormValid = ref(false);
const variantFormRef = ref();
const variantForm = ref<any>({
  id: null,
  sku: "",
  variant: "",
  price: 0,
  mrp: 0,
  quantity: 0,
  location: "",
});
let currentProduct: any = null;

/* FILTERS */
const search = ref("");
const selectedCategory = ref<string | null>(null);

/* TABLE HEADERS */
const headers = [
  { title: "Product", key: "name" },
  { title: "Price", key: "price" },
  { title: "Stock", key: "stock" },
  { title: "Category", key: "category_id" },
  { title: "", key: "data-table-expand" },
];

/* LOAD DATA */
const loadProducts = async () => {
  loading.value = true;
  products.value = (await listProducts({ company_id: COMPANY_ID })) || [];
  loading.value = false;
};

const loadCategories = async () => {
  categories.value =
    (await getCategories({ company_id: COMPANY_ID, parent_id: null })) || [];
};

onMounted(async () => {
  await loadCategories();
  await loadProducts();
});

const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map((c) => [c.id, c.name]))
);

const filteredProducts = computed(() => {
  return products.value.filter((p) => {
    const matchesSearch =
      !search.value ||
      p.name.toLowerCase().includes(search.value.toLowerCase());
    const matchesCategory =
      !selectedCategory.value || p.category_id === selectedCategory.value;
    return matchesSearch && matchesCategory;
  });
});

/* PRODUCT ACTIONS */
const openAdd = () => {
  isEdit.value = false;
  form.value = {
    id: null,
    name: "",
    sku: "",
    price: 0,
    mrp: 0,
    category_id: null,
  };
  productDialog.value = true;
};

const openEdit = (product: any) => {
  isEdit.value = true;
  form.value = { ...product };
  productDialog.value = true;
};

const submitProduct = async () => {
  if (!formRef.value?.validate()) return;

  const productPayload = {
    ...form.value,
    company_id: COMPANY_ID, // <- add this!
  };

  if (isEdit.value) {
    await updateProduct(form.value.id, productPayload);
  } else {
    await createProduct(productPayload); // now has company_id
  }

  productDialog.value = false;
  await loadProducts();
};

const removeProduct = async (id: string) => {
  if (!confirm("Delete this product?")) return;
  await deleteProduct(id);
  await loadProducts();
};

/* VARIANT ACTIONS */
const openVariantDialog = (product: any, variant: any = null) => {
  currentProduct = product;
  variantEdit.value = !!variant;
  variantForm.value = variant
    ? { ...variant }
    : {
        id: null,
        sku: "",
        variant: "",
        price: 0,
        mrp: 0,
        quantity: 0,
        location: "",
      };
  variantDialog.value = true;
};

const submitVariant = async () => {
  if (!variantFormRef.value?.validate()) return;

  if (variantEdit.value) {
    const index = currentProduct.items.findIndex(
      (v: any) => v.id === variantForm.value.id
    );
    if (index >= 0) currentProduct.items[index] = { ...variantForm.value };
  } else {
    currentProduct.items.push({
      ...variantForm.value,
      id: crypto.randomUUID(),
    });
  }
  variantDialog.value = false;
  variantForm.value = {
    id: null,
    sku: "",
    variant: "",
    price: 0,
    mrp: 0,
    quantity: 0,
    location: "",
  };
};

const deleteVariant = (product: any, variantId: string) => {
  product.items = product.items.filter((v: any) => v.id !== variantId);
};
</script>
