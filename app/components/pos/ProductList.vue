<template>
  <v-card>
    <v-card-title class="d-flex align-center gap-3">
      <v-text-field
        v-model="search"
        label="Search"
        density="compact"
        prepend-inner-icon="mdi-magnify"
        hide-details
      />

      <v-select
        v-model="selectedCategory"
        :items="categoryOptions"
        item-title="name"
        item-value="id"
        label="Category"
        density="compact"
        clearable
        hide-details
      />

      <v-spacer />
      <v-btn color="primary" @click="openAdd">Add Product</v-btn>
    </v-card-title>

    <v-data-table
      :headers="headers"
      :items="filteredProducts"
      item-key="id"
      :search="search"
    >
      <template #item.price="{ item }">₹ {{ item.price }}</template>

      <template #item.stock="{ item }">
        <v-chip :color="item.stock > 0 ? 'green' : 'red'" size="small">
          {{ item.stock }}
        </v-chip>
      </template>

      <template #item.actions="{ item }">
        <v-btn icon size="small" @click="openEdit(item)">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <v-btn icon size="small" color="red" @click="remove(item.id)">
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </template>
    </v-data-table>

    <!-- ADD / EDIT DIALOG -->
    <ProductFormDialog
      v-model="dialog"
      :product="editingProduct"
      :categories="categories"
      @save="saveProduct"
    />
  </v-card>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import ProductFormDialog from "./ProductFormDialog.vue";
import { useProducts } from "@/composables/pos/useProducts";
import { useCategories } from "@/composables/pos/useCategories";

const COMPANY_ID = "COMPANY_ID";

const { getProducts, createProduct, updateProduct, deleteProduct } =
  useProducts();
const { getCategories } = useCategories();

const products = ref<any[]>([]);
const categories = ref<any[]>([]);

const dialog = ref(false);
const editingProduct = ref<any | null>(null);

const search = ref("");
const selectedCategory = ref<string | null>(null);

const headers = [
  { text: "Name", value: "name" },
  { text: "SKU", value: "sku" },
  { text: "Price", value: "price" },
  { text: "Stock", value: "stock" },
  { text: "Actions", value: "actions", sortable: false },
];

onMounted(async () => {
  products.value = await getProducts({ company_id: COMPANY_ID });
  categories.value = await getCategories({ company_id: COMPANY_ID });
});

/* ================= FILTER ================= */

const categoryOptions = computed(() => [
  { id: null, name: "All" },
  ...categories.value,
]);

const filteredProducts = computed(() =>
  selectedCategory.value
    ? products.value.filter(p => p.category_id === selectedCategory.value)
    : products.value
);

/* ================= ACTIONS ================= */

const openAdd = () => {
  editingProduct.value = null;
  dialog.value = true;
};

const openEdit = (product: any) => {
  editingProduct.value = product;
  dialog.value = true;
};

const saveProduct = async (data: any) => {
  if (editingProduct.value) {
    await updateProduct(editingProduct.value.id, data);
    Object.assign(
      products.value.find(p => p.id === editingProduct.value.id),
      data
    );
  } else {
    const id = await createProduct({ ...data, company_id: COMPANY_ID });
    products.value.push({ id, ...data });
  }
  dialog.value = false;
};

const remove = async (id: string) => {
  if (!confirm("Delete product?")) return;
  await deleteProduct(id);
  products.value = products.value.filter(p => p.id !== id);
};
</script>
