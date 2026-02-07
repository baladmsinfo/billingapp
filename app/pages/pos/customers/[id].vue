<template>
  <v-container v-if="customer" fluid class="pa-4 modern-bg">

    <!-- ============================
         CUSTOMER HEADER
    ============================= -->
    <v-card rounded="xl" elevation="0" class="pa-4 mb-4 gradient-card">
      <div class="d-flex justify-space-between align-center">
        <div>
          <div class="text-h6 font-weight-bold">{{ customer.name }}</div>
          <div class="text-caption text-grey">
            Customer ID: {{ shortId(customer.id) }}
          </div>
        </div>

        <v-avatar size="58" class="elevated-avatar">
          <v-icon size="40">mdi-account</v-icon>
        </v-avatar>
      </div>

      <div class="mt-3">
        <div class="detail-row"><span class="label">Phone</span> <span class="value">{{ customer.phone || '-' }}</span></div>
        <div class="detail-row"><span class="label">Email</span> <span class="value">{{ customer.email || '-' }}</span></div>
        <div class="detail-row"><span class="label">GSTIN</span> <span class="value">{{ customer.gstin || '-' }}</span></div>
      </div>
    </v-card>

    <!-- ============================
         ACCOUNT DETAILS
    ============================= -->
    <v-card rounded="xl" class="pa-4 mb-4" elevation="0">
      <div class="section-title mb-3">Account Summary</div>

      <div class="summary-grid">
        <v-card class="info-card" rounded="lg" elevation="0">
          <div class="label">Opening Balance</div>
          <div class="big-value">₹{{ customer.opening_balance }}</div>
        </v-card>

        <v-card class="info-card" rounded="lg" elevation="0">
          <div class="label">Credit Limit</div>
          <div class="big-value">₹{{ customer.credit_limit }}</div>
        </v-card>
      </div>
    </v-card>

    <!-- ============================
         ADDRESSES
    ============================= -->
    <v-card rounded="xl" class="pa-4 mb-4" elevation="0">
      <div class="section-title mb-2">Addresses</div>

      <v-expansion-panels class="rounded-xl" v-if="customer.addresses?.length">
        <v-expansion-panel>
          <v-expansion-panel-title>
            Saved Addresses ({{ customer.addresses.length }})
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <v-list density="compact">
              <v-list-item
                v-for="addr in customer.addresses"
                :key="addr.id"
                class="modern-address"
              >
                <div class="d-flex justify-space-between align-start w-100">
                  <div>
                    <div class="addr-title">
                      {{ fullAddress(addr) }}
                    </div>
                    <div class="text-caption text-grey">
                      {{ addr.city }}, {{ addr.state }} - {{ addr.pincode }}
                    </div>
                  </div>

                  <v-chip size="x-small" rounded="md" :color="chipColor(addr.address_type)">
                    {{ addr.address_type }}
                  </v-chip>
                </div>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <div v-else class="text-grey text-caption mt-2">No saved addresses.</div>
    </v-card>

    <!-- ============================
         INVOICE SUMMARY
    ============================= -->
    <v-card rounded="xl" class="pa-4 mb-4" elevation="0">
      <div class="section-title">Invoices</div>

      <div class="summary-grid mt-3">
        <v-card class="info-card" rounded="lg" elevation="0">
          <div class="label">Total Invoices</div>
          <div class="big-value">{{ customer.invoices.length }}</div>
        </v-card>

        <v-card class="info-card" rounded="lg" elevation="0">
          <div class="label">Total Payments</div>
          <div class="big-value">₹{{ totalPaid }}</div>
        </v-card>
      </div>
    </v-card>

    <!-- ============================
         INVOICE LIST
    ============================= -->
    <v-card rounded="xl" class="pa-4 mb-4" elevation="0">
      <div class="section-title mb-3">Invoice Details</div>

      <v-expansion-panels>
        <v-expansion-panel
          v-for="inv in customer.invoices"
          :key="inv.id"
        >
          <v-expansion-panel-title>
            <div class="d-flex justify-space-between align-center w-100">
              <span>Invoice #{{ inv.invoice_number }}</span>

              <v-chip
                size="small"
                :color="inv.status === 'PAID' ? 'green' : 'orange'"
                class="ml-3"
              >
                {{ inv.status }}
              </v-chip>
            </div>
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <!-- Invoice Info -->
            <div class="detail-row"><span class="label">Date</span> <span class="value">{{ formatDate(inv.date) }}</span></div>
            <div class="detail-row"><span class="label">Due Date</span> <span class="value">{{ formatDate(inv.due_date) }}</span></div>

            <v-divider class="my-3" />

            <!-- Items -->
            <div class="sub-title">Items</div>
            <v-list density="compact" class="mt-2">
              <v-list-item v-for="item in inv.items" :key="item.id">
                <div class="d-flex justify-space-between w-100">
                  <span>{{ item.product?.name }}</span>
                  <span class="value">₹{{ item.total }}</span>
                </div>
              </v-list-item>
            </v-list>

            <v-divider class="my-3" />

            <!-- Payments -->
            <div class="sub-title">Payments</div>

            <v-list v-if="inv.payments.length" density="compact" class="mt-2">
              <v-list-item v-for="p in inv.payments" :key="p.id">
                <div class="d-flex justify-space-between w-100">
                  <span>{{ formatDate(p.date) }}</span>
                  <span class="value green--text">₹{{ p.amount }}</span>
                </div>
              </v-list-item>
            </v-list>

            <div v-else class="text-caption text-grey mt-1">No payments recorded.</div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card>

    <!-- ============================
         UNLINKED PAYMENTS
    ============================= -->
    <!-- <v-card rounded="xl" class="pa-4 mb-4" elevation="0">
      <div class="section-title">Unlinked Payments</div>

      <v-list v-if="customer.payments.unlinked.length" density="compact" class="mt-2">
        <v-list-item
          v-for="p in customer.payments.unlinked"
          :key="p.id"
          class="modern-address"
        >
          <div class="d-flex justify-space-between w-100">
            <div>
              <div class="addr-title">{{ p.method }} ({{ p.type }})</div>
              <div class="text-caption text-grey">{{ formatDate(p.date) }}</div>
            </div>

            <div class="value green--text">₹{{ p.amount }}</div>
          </div>
        </v-list-item>
      </v-list>

      <div v-else class="text-grey text-caption mt-2">
        No standalone payments.
      </div>
    </v-card> -->

  </v-container>

  <!-- EMPTY UI -->
  <div v-else class="empty">
    <v-icon size="60">mdi-account-alert</v-icon>
    <div>No Customer Found</div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useCustomers } from "@/composables/pos/useCustomers";

definePageMeta({
  title: "Customer Details",
  showBack: true,
});

const route = useRoute();
const { getCustomerById } = useCustomers();
const customer = ref(null);

onMounted(async () => {
  customer.value = await getCustomerById(route.params.id);

  console.log("Customer Invoices:", customer.value.invoices);
  
});

/* ==================== HELPERS ===================== */

const shortId = (id) => id.slice(0, 8);

const fullAddress = (addr) =>
  [addr.address_line1, addr.address_line2, addr.address_line3]
    .filter(Boolean)
    .join(", ");

const chipColor = (type) =>
  ({
    BILLING: "primary",
    SHIPPING: "green",
  }[type] || "grey");

const formatDate = (ts) =>
  ts
    ? new Date(ts * 1000).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

/* ==================== COMPUTED ===================== */

const totalPaid = computed(() =>
  customer.value
    ? customer.value.payments.all.reduce((sum, p) => sum + p.amount, 0)
    : 0
);
</script>

<style scoped>
.modern-bg {
  background: #fafafa;
}

.gradient-card {
  background: linear-gradient(135deg, #f6f7ff, #ffffff);
}

.section-title {
  font-weight: 600;
  font-size: 15px;
  color: #555;
}

.sub-title {
  font-weight: 600;
  font-size: 14px;
  color: #777;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.label {
  color: #777;
}

.value {
  font-weight: 600;
}

.big-value {
  font-size: 20px;
  font-weight: 700;
}

.info-card {
  padding: 14px;
  text-align: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.modern-address {
  padding: 10px 0;
  border-bottom: 1px dashed #ddd;
}

.addr-title {
  font-size: 14px;
  font-weight: 600;
}

.elevated-avatar {
  background: #fff;
  box-shadow: 0 3px 12px rgba(0,0,0,0.08);
}

.empty {
  padding: 50px;
  text-align: center;
  color: #888;
}
</style>