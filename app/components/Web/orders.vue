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
        show-select="false"
        @update:page="onPage"
        @update:items-per-page="onItemsPerPage"
        @update:sort-by="onSort"
        @click:row="onRow"
      >
        <template #item.status="{ item }">
          <v-chip size="small" :color="statusColor(item.status)">
            {{ item.status }}
          </v-chip>
        </template>

        <template #item.total_amount="{ item }">
          ₹{{ Number(item.total_amount).toFixed(2) }}
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
const props = defineProps<{
  items: any[]
  loading: boolean
  page: number
  itemsPerPage: number
  sortBy: string
  sortDesc: boolean
}>()

const emit = defineEmits(["update", "rowClick"])

const headers = [
  { title: "Invoice #", key: "invoice_number" },
  { title: "Date", key: "date" },
  { title: "Type", key: "type" },
  { title: "Status", key: "status" },
  { title: "Amount", key: "total_amount", align: "end" },
]

const onPage = (p: number) => {
  props.page = p
  emit("update")
}

const onItemsPerPage = (n: number) => {
  props.itemsPerPage = n
  emit("update")
}

const onSort = (sort: any[]) => {
  if (sort.length) {
    props.sortBy = sort[0].key
    props.sortDesc = sort[0].order === "desc"
    emit("update")
  }
}

const onRow = (_: any, row: any) => {
  emit("rowClick", row.item)
}

const statusColor = (s: string) => {
  switch (s) {
    case "PAID": return "green"
    case "PARTIAL": return "orange"
    case "CANCELLED": return "red"
    default: return "grey"
  }
}
</script>
