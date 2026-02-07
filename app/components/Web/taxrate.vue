<template>
  <v-container fluid class="pa-4">

    <!-- HEADER -->
    <v-row align="center" class="mb-4">
      <v-col cols="12" md="6">
        <h2 class="text-h5 font-weight-bold">Tax Rates</h2>
      </v-col>
      <v-col cols="12" md="6" class="text-right">
        <v-btn color="primary" rounded="lg" @click="openAddDialog">
          <v-icon left>mdi-plus</v-icon>
          Add Tax Rate
        </v-btn>
      </v-col>
    </v-row>

    <!-- SUMMARY -->
    <v-card class="pa-4 mb-4" elevation="0">
      <div class="d-flex justify-space-between align-center">
        <div>
          <div class="text-caption text-grey">Total Tax Rates</div>
          <div class="text-h5 font-weight-bold">{{ filteredRates.length }}</div>
        </div>
        <v-icon size="36" color="primary">mdi-percent</v-icon>
      </div>
    </v-card>

    <!-- SEARCH -->
    <v-text-field 
      v-model="search"
      placeholder="Search tax rates"
      prepend-inner-icon="mdi-magnify"
      variant="solo"
      rounded="xl"
      hide-details
      density="comfortable"
      class="mb-4"
    />

    <!-- DESKTOP TABLE -->
    <v-card class="d-none d-md-block" elevation="1">
      <v-data-table
        :headers="headers"
        :items="filteredRates"
        :page="page"
        :items-per-page="itemsPerPage"
        @update:page="page = $event"
        @update:items-per-page="itemsPerPage = $event"
        :items-per-page-options="[5, 10, 20, 50]"
      >

        <!-- Percentage -->
        <template #item.percentage="{ item }">
          {{ item.percentage }} %
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <v-menu>
            <template #activator="{ props }">
              <v-btn icon variant="text" size="small" v-bind="props">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>

            <v-list>
              <v-list-item @click="editTaxRate(item)">Edit</v-list-item>
              <v-list-item class="text-red" @click="confirmDelete(item.id)">Delete</v-list-item>
            </v-list>
          </v-menu>
        </template>

        <!-- Pagination -->
        <template #bottom>
          <div class="pa-4 d-flex justify-end">
            <v-pagination
              v-model="page"
              :length="Math.ceil(filteredRates.length / itemsPerPage)"
              total-visible="5"
              rounded="circle"
            />
          </div>
        </template>

      </v-data-table>
    </v-card>

    <!-- MOBILE CARD LIST -->
    <v-row dense class="d-md-none">
      <v-col cols="12" v-for="t in filteredRates" :key="t.id">
        <v-card class="product-card mb-4" rounded="xl" elevation="0">
          <div class="card-top">
            <div>
              <div class="product-name">{{ t.name }}</div>
              <div class="product-sku text-grey">{{ t.percentage }} %</div>
            </div>

            <v-menu>
              <template #activator="{ props }">
                <v-btn icon size="small" v-bind="props">
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>

              <v-list rounded="lg" density="compact">
                <v-list-item @click="editTaxRate(t)">Edit</v-list-item>
                <v-list-item class="text-red" @click="confirmDelete(t.id)">Delete</v-list-item>
              </v-list>
            </v-menu>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- EMPTY STATE -->
    <v-card v-if="!filteredRates.length" rounded="xl" elevation="0" class="pa-6 text-center">
      <v-icon size="48" color="grey">mdi-percent</v-icon>
      <div class="text-subtitle-1 mt-2">No tax rates found</div>
      <v-btn color="primary" rounded="xl" class="mt-3" @click="openAddDialog">
        Add Tax Rate
      </v-btn>
    </v-card>

    <!-- ADD / EDIT DIALOG -->
    <v-dialog v-model="dialog" max-width="420" persistent>
      <v-card rounded="xl" class="pa-4">
        <div class="text-h6 font-weight-bold mb-4">
          {{ editMode ? "Edit Tax Rate" : "Add Tax Rate" }}
        </div>

        <v-text-field
          v-model="form.name"
          label="Tax Name"
          rounded="lg"
          variant="outlined"
          density="comfortable"
          class="mb-3"
        />

        <v-text-field
          v-model="form.percentage"
          type="number"
          label="Percentage (%)"
          rounded="lg"
          variant="outlined"
          density="comfortable"
          class="mb-3"
        />

        <v-row class="mt-4">
          <v-col cols="6">
            <v-btn block variant="text" @click="dialog = false">Cancel</v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn block color="primary" @click="saveTaxRate">Save</v-btn>
          </v-col>
        </v-row>
      </v-card>
    </v-dialog>

    <!-- DELETE CONFIRM -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card class="pa-4" rounded="xl">
        <div class="text-h6 font-weight-bold mb-3">Delete Tax Rate?</div>
        <p class="text-body-2">This action cannot be undone.</p>

        <v-row class="mt-4">
          <v-col cols="6">
            <v-btn block variant="text" @click="deleteDialog = false">Cancel</v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn block color="red" @click="deleteTaxRateFinal">Delete</v-btn>
          </v-col>
        </v-row>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useTaxRates } from "@/composables/pos/useTaxrates";

const COMPANY_ID = "LOCAL_COMPANY";

const { createTaxRate, fetchTaxRates, updateTaxRate, deleteTaxRate } = useTaxRates();

/* LIST */
const rates = ref([]);

/* SEARCH + PAGINATION */
const search = ref("");
const page = ref(1);
const itemsPerPage = ref(10);

/* UI STATE */
const dialog = ref(false);
const deleteDialog = ref(false);
const editMode = ref(false);
let deleteId = null;

/* FORM */
const form = ref({
  id: null,
  name: "",
  percentage: "",
});

/* HEADERS */
const headers = [
  { title: "Tax Name", key: "name" },
  { title: "Percentage (%)", key: "percentage" },
  { title: "Actions", key: "actions", sortable: false, width: 60 },
];

/* FILTER */
const filteredRates = computed(() =>
  rates.value.filter((r) =>
    r.name?.toLowerCase().includes(search.value.toLowerCase())
  )
);

/* INIT */
onMounted(async () => {
  rates.value = await fetchTaxRates(COMPANY_ID);
});

/* OPEN ADD */
function openAddDialog() {
  editMode.value = false;
  form.value = { id: null, name: "", percentage: "" };
  dialog.value = true;
}

/* EDIT */
function editTaxRate(t) {
  editMode.value = true;
  form.value = { ...t };
  dialog.value = true;
}

/* SAVE */
async function saveTaxRate() {
  if (!form.value.name || form.value.percentage === "") return;

  const payload = {
    ...form.value,
    percentage: Number(form.value.percentage),
  };

  if (editMode.value) {
    await updateTaxRate(payload);
  } else {
    await createTaxRate({
      ...payload,
      company_id: COMPANY_ID,
    });
  }

  dialog.value = false;
  rates.value = await fetchTaxRates(COMPANY_ID);
}

/* DELETE */
function confirmDelete(id) {
  deleteId = id;
  deleteDialog.value = true;
}

async function deleteTaxRateFinal() {
  await deleteTaxRate(deleteId);
  deleteDialog.value = false;
  rates.value = await fetchTaxRates(COMPANY_ID);
}
</script>

<style scoped>
.product-card {
  padding: 16px;
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.product-name {
  font-size: 1.1rem;
  font-weight: 600;
}
</style>