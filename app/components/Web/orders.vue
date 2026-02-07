<template>
  <v-container fluid>
    <v-card rounded="xl">
      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        :page="page"
        :items-per-page="itemsPerPage"
        :sort-by="[sortBy]"
        :sort-desc="[sortDesc]"
        item-key="id"
        hover
        density="comfortable"
        @update:page="onPage"
        @update:items-per-page="onItemsPerPage"
        @update:sort-by="onSort"
        @click:row="onRow"
      >
        <!-- STATUS -->
        <template #item.status="{ item }">
          <v-chip size="small" :color="statusColor(item.status)" label>
            {{ item.status }}
          </v-chip>
        </template>

        <!-- AMOUNT -->
        <template #item.total_amount="{ item }">
          ₹{{ Number(item.total_amount).toFixed(2) }}
        </template>

        <!-- DATE -->
        <template #item.date="{ item }">
          {{ new Date(item.date).toLocaleDateString() }}
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { watch } from "vue";

/* -----------------------------------
   PROPS
----------------------------------- */
const props = defineProps({
  items: Array,
  loading: Boolean,
  page: Number,
  itemsPerPage: Number,
  sortBy: String,
  sortDesc: Boolean,

  // FILTERS coming from parent
  filterStatus: String,
  filterType: String,
  filterSearch: String,
  filterDate: Object,
});

/* -----------------------------------
   EMITS
----------------------------------- */
const emit = defineEmits(["update", "rowClick", "filterChanged"]);

/* -----------------------------------
   HEADERS
----------------------------------- */
const headers = [
  { title: "Invoice #", key: "invoice_number" },
  { title: "Date", key: "date" },
  { title: "Type", key: "type" },
  { title: "Status", key: "status" },
  { title: "Amount", key: "total_amount", align: "end" },
];

/* -----------------------------------
   WATCH FILTERS (Trigger Server Reload)
----------------------------------- */
watch(
  () => [
    props.filterStatus,
    props.filterType,
    props.filterSearch,
    props.filterDate,
  ],
  () => {
    emit("filterChanged", {
      status: props.filterStatus,
      type: props.filterType,
      search: props.filterSearch,
      date: props.filterDate,
    });
  }
);

/* -----------------------------------
   DATA-TABLE EVENTS 
----------------------------------- */
const onPage = (newPage: number) => {
  emit("update", { page: newPage });
};

const onItemsPerPage = (n: number) => {
  emit("update", { itemsPerPage: n });
};

const onSort = (sort: any[]) => {
  if (!sort.length) return;

  emit("update", {
    sortBy: sort[0].key,
    sortDesc: sort[0].order === "desc",
  });
};

const onRow = (_event: any, row: any) => {
  emit("rowClick", row.item);
};

/* -----------------------------------
   UI HELPERS
----------------------------------- */
const statusColor = (s: string) => {
  switch (s) {
    case "PAID":
      return "green";
    case "PARTIAL":
      return "orange";
    case "CANCELLED":
      return "red";
    default:
      return "grey";
  }
};
</script>