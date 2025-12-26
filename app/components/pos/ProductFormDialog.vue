<template>
  <v-dialog v-model="model" max-width="600">
    <v-card>
      <v-card-title>
        {{ isEdit ? "Edit Product" : "Add Product" }}
      </v-card-title>

      <v-card-text class="d-flex flex-column gap-3">
        <v-text-field v-model="form.name" label="Product Name" required />
        <v-text-field v-model="form.sku" label="SKU" />
        <v-text-field
          v-model.number="form.price"
          label="Price"
          type="number"
        />
        <v-text-field
          v-model.number="form.stock"
          label="Stock"
          type="number"
        />

        <!-- CATEGORY SELECT -->
        <v-select
          v-model="form.category_id"
          :items="categories"
          item-title="name"
          item-value="id"
          label="Category"
          clearable
        />

        <!-- VARIANTS -->
        <v-switch
          v-model="form.has_variants"
          label="Has Variants"
        />

        <v-switch
          v-model="form.status"
          true-value="ACTIVE"
          false-value="INACTIVE"
          label="Active"
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" @click="save">
          {{ isEdit ? "Update" : "Save" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";

const props = defineProps<{
  modelValue: boolean;
  product?: any | null;
  categories: any[];
}>();

const emit = defineEmits(["update:modelValue", "save"]);

const model = computed({
  get: () => props.modelValue,
  set: v => emit("update:modelValue", v),
});

const isEdit = computed(() => !!props.product);

const emptyForm = () => ({
  name: "",
  sku: "",
  price: 0,
  stock: 0,
  category_id: null,
  has_variants: false,
  status: "ACTIVE",
});

const form = reactive(emptyForm());

watch(
  () => props.product,
  p => Object.assign(form, p ? p : emptyForm()),
  { immediate: true }
);

const save = () => emit("save", { ...form });
const close = () => (model.value = false);
</script>
