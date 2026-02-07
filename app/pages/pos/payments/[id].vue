<template>
  <v-container v-if="payment" class="payment-page pa-4">

    <!-- HEADER CARD -->
    <v-card class="mb-4 pa-4" rounded="xl" elevation="0">
      <div class="d-flex justify-space-between align-center mb-2">
        <div>
          <div class="text-h6 font-weight-bold">Payment #{{ payment.id.slice(0, 8) }}</div>
          <div class="text-caption text-grey">
            {{ formatDate(payment.date) }}
          </div>
        </div>

        <v-chip
          size="small"
          :color="statusColor(payment.status)"
          class="text-uppercase"
        >
          {{ payment.status }}
        </v-chip>
      </div>

      <!-- Amount -->
      <div class="text-h4 font-weight-bold mt-3">
        ₹{{ payment.amount.toFixed(2) }}
      </div>

      <!-- Type / Method -->
      <div class="d-flex flex-wrap mt-3">
        <v-chip variant="outlined" class="mr-2 mb-2">
          {{ payment.type }}
        </v-chip>
        <v-chip variant="outlined" class="mb-2">
          {{ payment.method }}
        </v-chip>
      </div>
    </v-card>

    <!-- CUSTOMER CARD -->
    <v-card class="mb-4 pa-4" rounded="xl" elevation="0" v-if="party">
      <div class="section-title mb-2">Customer</div>

      <div class="d-flex justify-space-between">
        <div>
          <div class="text-subtitle-1 font-weight-medium">{{ party.name }}</div>
          <div class="text-caption text-grey">{{ party.phone || 'No phone' }}</div>
        </div>
        <v-icon>mdi-account-circle</v-icon>
      </div>
    </v-card>

    <!-- INVOICE CARD -->
    <v-card class="mb-4 pa-4" rounded="xl" elevation="0" v-if="invoice">
      <div class="section-title mb-2">Linked Invoice</div>

      <div class="d-flex justify-space-between align-center">
        <div>
          <div class="font-weight-medium">#{{ invoice.invoice_number }}</div>
          <div class="text-caption text-grey">{{ formatDate(invoice.date) }}</div>
        </div>

        <v-chip size="small" color="primary">
          {{ invoice.status }}
        </v-chip>
      </div>
    </v-card>

    <!-- META DETAILS -->
    <v-card rounded="xl" class="pa-4 mb-4" elevation="0">
      <div class="section-title mb-2">Details</div>

      <div class="detail-row">
        <span class="label">Reference No</span>
        <span class="value">{{ payment.reference_no || '-' }}</span>
      </div>

      <div class="detail-row">
        <span class="label">Gateway ID</span>
        <span class="value">{{ payment.gateway_payment_id || '-' }}</span>
      </div>

      <div class="detail-row">
        <span class="label">Note</span>
        <span class="value">{{ payment.note || '-' }}</span>
      </div>

      <v-divider class="my-3" />

      <div class="detail-row">
        <span class="label">Paid At</span>
        <span class="value">{{ formatDate(payment.created_at) }}</span>
      </div>
    </v-card>

    <!-- PRINT -->
    <v-btn
      block
      rounded="xl"
      color="primary"
      size="large"
      class="mb-3"
      @click="printPage"
    >
      <v-icon start>mdi-printer</v-icon>
      Print Receipt
    </v-btn>

  </v-container>

  <!-- EMPTY -->
  <div v-else class="empty">
    <v-icon size="56">mdi-cash-remove</v-icon>
    <div>No payment found</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { usePayment } from "@/composables/pos/usePayment";

definePageMeta({
  title: "Payment Details",
  showBack: true
});

const route = useRoute();
const { getPaymentById } = usePayment();

const payment = ref<any>(null);
const invoice = ref<any>(null);
const party = ref<any>(null);

onMounted(async () => {
  const data = await getPaymentById(route.params.id as string);
  if (data) {
    payment.value = data.payment;
    invoice.value = data.invoice;
    party.value = data.party;
  }
});

const formatDate = (ts: number) =>
  new Date(ts).toLocaleString("en-IN", {
    hour12: true,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const statusColor = (s: string) =>
  ({ SUCCESS: "green", FAILED: "red", REFUNDED: "orange" }[s] || "grey");

const printPage = () => window.print();
</script>

<style scoped>
.section-title {
  font-weight: 600;
  font-size: 14px;
  color: #666;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin: 6px 0;
}

.label {
  color: #777;
  font-size: 13px;
}

.value {
  font-weight: 500;
}

.empty {
  padding: 40px;
  text-align: center;
  color: grey;
}
</style>