<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()

const props = defineProps({
  items: Array,
  loading: Boolean,
})

const page = ref(1)
const itemsPerPage = ref(10)

/* ---------- ICONS ---------- */
const iconByMethod = (m) => ({
  CASH: "mdi-cash",
  UPI: "mdi-qrcode-scan",
  CARD: "mdi-credit-card-outline",
  BANK_TRANSFER: "mdi-bank-transfer",
  CHEQUE: "mdi-book",
  OTHER: "mdi-dots-horizontal",
}[m] || "mdi-cash")

/* ---------- HEADERS ---------- */
const headers = [
  { title: "", key: "avatar", sortable: false, width: 60 },
  { title: "Amount", key: "amount", sortable: true },
  { title: "Date", key: "date", sortable: true },
  { title: "Method", key: "method", sortable: true },
  { title: "Reference", key: "reference", sortable: false },
  { title: "Type", key: "type", sortable: false },
  { title: "", key: "actions", sortable: false, width: 40 },
]

const onPaymentClick = (item) => {
  router.push(`/pos/payments/${item.id}`)
}
</script>

<template>
  <v-card elevation="1" class="mt-6">
    <v-card-title class="d-flex justify-space-between align-center">
      <span class="text-h6 font-weight-bold">Recent Payments</span>
    </v-card-title>

    <v-divider />

    <v-data-table
      :headers="headers"
      :items="items"
      :loading="loading"
      class="payment-table"
      hover

      v-model:page="page"
      v-model:items-per-page="itemsPerPage"
      :items-per-page-options="[5, 10, 20, 50]"
    >

      <template #loading>
        <v-skeleton-loader type="table" />
      </template>

      <template #item.avatar="{ item }">
        <v-avatar size="36" color="primary">
          <v-icon>{{ iconByMethod(item.method) }}</v-icon>
        </v-avatar>
      </template>

      <template #item.amount="{ item }">
        <span class="font-weight-bold">₹{{ item.amount }}</span>
      </template>

      <template #item.date="{ item }">
        {{ new Date(item.date).toLocaleString() }}
      </template>

      <template #item.method="{ item }">
        <span class="text-primary">{{ item.method }}</span>
      </template>

      <template #item.reference="{ item }">
        {{ item.reference || "-" }}
      </template>

      <template #item.type="{ item }">
        {{ item.type || "-" }}
      </template>

      <template #item.actions="{ item }">
        <v-btn icon variant="text" @click="onPaymentClick(item)">
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>
      </template>

      <!-- EMPTY -->
      <template #no-data>
        <div class="pa-8 text-center">
          <v-icon size="60" color="primary" class="mb-2">mdi-cash-remove</v-icon>
          <h3 class="mb-1">No payments yet</h3>
          <p class="text-medium-emphasis">They will appear once customers start paying.</p>
        </div>
      </template>

      <!-- PAGINATION -->
      <template #bottom>
        <div class="d-flex justify-end pa-2">
          <v-pagination
            v-model="page"
            :length="Math.ceil(items.length / itemsPerPage)"
            total-visible="5"
            rounded="circle"
          />
        </div>
      </template>

    </v-data-table>
  </v-card>
</template>

<style scoped>
.payment-table {
  border-radius: 12px;
}
.payment-table ::v-deep(table thead th) {
  background: #fafafa !important;
  font-weight: 600 !important;
}
</style>