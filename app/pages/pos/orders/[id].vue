<template>
  <v-container v-if="invoice" class="invoice-page pa-3">

    <!-- HEADER -->
    <v-card class="header-card mb-3" rounded="xl">
      <div class="header-top">
        <div>
          <div class="invoice-no">#{{ invoice.invoice_number }}</div>
          <div class="invoice-date">
            {{ formatDate(invoice.date) }}
          </div>
        </div>

        <v-chip
          size="small"
          class="status-chip"
          :color="statusColor(invoice.status)"
        >
          {{ invoice.status }}
        </v-chip>
      </div>

      <div class="header-meta">
        <div>
          <span class="label">Type</span>
          <span class="value">{{ invoice.type }}</span>
        </div>

        <div>
          <span class="label">Customer</span>
          <span class="value">
            {{ invoice.customer_id || "Walk-in" }}
          </span>
        </div>
      </div>
    </v-card>
    
    <!-- ITEMS -->
    <v-card rounded="xl" class="mb-3 pa-3">
      <div class="section-title mb-2">Items</div>

      <v-card
        v-for="item in invoice.items"
        :key="item.id"
        rounded="lg"
        class="item-card mb-2"
        elevation="0"
      >
        <div class="item-row">
          <div>
            <div class="item-name">
              {{ item.product.name }}
            </div>
            <div class="item-meta">
              ₹{{ item.price }} × {{ item.quantity }} QTY
            </div>
          </div>

          <div class="item-total">
            ₹{{ (item.price * item.quantity).toFixed(2) }}
          </div>
        </div>
      </v-card>
    </v-card>

    <!-- TOTALS -->
    <v-card rounded="xl" class="mb-3 pa-4 total-card">
      <div class="row">
        <span>Subtotal</span>
        <span>₹{{ subtotal.toFixed(2) }}</span>
      </div>

      <div class="row muted">
        <span>Tax</span>
        <span>₹{{ invoice.tax_amount || 0 }}</span>
      </div>

      <div class="row muted">
        <span>Discount</span>
        <span>-₹{{ invoice.discount_amount || 0 }}</span>
      </div>

      <v-divider class="my-2" />

      <div class="row grand-total">
        <span>Total</span>
        <span>₹{{ invoice.total_amount.toFixed(2) }}</span>
      </div>
    </v-card>

    <!-- ACTIONS -->
    <v-btn
      block
      size="large"
      rounded="xl"
      color="primary"
      class="mb-3"
      @click="printInvoice"
    >
      <v-icon start>mdi-printer</v-icon>
      Print Invoice
    </v-btn>

  </v-container>

  <!-- EMPTY -->
  <div v-else class="empty">
    <v-icon size="56">mdi-receipt-text-outline</v-icon>
    <div>No invoice found</div>
  </div>
</template>


<script setup lang="ts">
import { ref, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useInvoice } from "@/composables/pos/useInvoices"

const device = useDevice();
definePageMeta({
  title: 'ORDER INFORMATION',
  showBack: true
})

const route = useRoute()
const router = useRouter()
const { getInvoiceById } = useInvoice()

const invoice = ref<any>(null)

await (async () => {
  invoice.value = await getInvoiceById(route.params.id as string)
  if (!invoice.value) router.push("/pos/orders")
})()

const subtotal = computed(() =>
  invoice.value?.items?.reduce(
    (s: number, i: any) => s + i.price * i.quantity,
    0
  ) || 0
)

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

const statusColor = (s: string) =>
  ({ PAID: "green", PARTIAL: "orange", PAYLATER: "blue", CANCELLED: "red" }[s] || "grey")

const printInvoice = () => window.print()
</script>

<style scoped>
.invoice-page {
  max-width: 480px;
  margin: auto;
}

/* HEADER */
.header-card {
  padding: 16px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.invoice-no {
  font-size: 18px;
  font-weight: 700;
}

.invoice-date {
  font-size: 12px;
  color: #777;
}

.header-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
}

.label {
  font-size: 11px;
  color: #888;
}

.value {
  display: block;
  font-weight: 500;
}

/* ITEMS */
.section-title {
  font-weight: 600;
}

.item-card {
  padding: 12px;
  background: #fafafa;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-name {
  font-weight: 500;
}

.item-meta {
  font-size: 12px;
  color: #777;
}

.item-total {
  font-weight: 600;
}

/* TOTALS */
.total-card {
  background: #f8f9fb;
}

.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.muted {
  color: #777;
  font-size: 13px;
}

.grand-total {
  font-size: 18px;
  font-weight: 700;
}

/* EMPTY */
.empty {
  text-align: center;
  padding: 64px 0;
  color: #777;
}
</style>
