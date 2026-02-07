<template>
  <v-container fluid class="pa-3">
    <!-- HEADER 
    <v-row align="center" justify="space-between" class="mb-6">
      <v-col cols="8" class="pa-0">
        <div class="text-h5 font-weight-semibold">POS Dashboard</div>
        <div class="text-caption text-medium-emphasis mt-1">
          Today • Real-time overview
        </div>
      </v-col>

      <v-col cols="auto" class="pa-0">
        <v-avatar size="46" class="header-avatar elevation-3">
          <v-icon size="22">mdi-store</v-icon>
        </v-avatar>
      </v-col>
    </v-row>-->

    <!-- STATS (Swipeable) -->
    <v-slide-group show-arrows="false" class="mb-2 pa-1" center-active>
      <v-slide-group-item v-for="card in stats" :key="card.title">
        <v-card rounded="2xl" elevation="3" class="stat-card mr-2 mb-2" width="180">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">
                {{ card.title }}
              </div>
              <div class="text-caption font-weight-bold mt-1">
                {{ card.value }}
              </div>
            </div>

            <v-avatar size="40" :class="['stat-icon', card.bg]">
              <v-icon size="18">{{ card.icon }}</v-icon>
            </v-avatar>
          </div>
        </v-card>
      </v-slide-group-item>
    </v-slide-group>

    <!-- QUICK ACTIONS -->
    <div class="section-title">Quick Actions</div>
    <v-row dense class="mb-4">
      <v-col cols="4" v-for="a in actions" :key="a.title">
        <v-card
          rounded="2xl"
          elevation="2"
          class="action-card"
          @click="a.action?.()"
        >
          <v-avatar size="46" class="action-avatar">
            <v-icon size="22">{{ a.icon }}</v-icon>
          </v-avatar>
          <div class="text-caption font-weight-medium mt-2">
            {{ a.title }}
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- RECENT TRANSACTIONS -->
    <!--<div class="section-title">Recent Transactions</div>
    <v-card rounded="2xl" elevation="3" class="mb-5">
      <v-list density="comfortable">
        <v-list-item v-for="t in transactions" :key="t.id">
          <template #prepend>
            <v-avatar size="38" class="txn-avatar">
              <v-icon size="18">mdi-receipt-text</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="text-body-2 font-weight-medium">
            {{ t.customer }}
          </v-list-item-title>

          <v-list-item-subtitle class="text-caption">
            {{ t.method }} payment
          </v-list-item-subtitle>

          <template #append>
            <div class="text-body-2 font-weight-bold">₹ {{ t.amount }}</div>
          </template>
        </v-list-item>

        <v-list-item v-if="!transactions.length && !loading">
          <v-list-item-title class="text-caption text-medium-emphasis">
            No transactions today
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>-->

    <!-- 🆕 RECENT ORDERS -->
    <div class="section-title">Recent Orders</div>
    <v-card rounded="2xl" variant="flat" class="">
      <v-list density="comfortable">
        <v-list-item v-for="o in recentOrders" :key="o.id" :to="`/pos/orders/${o.id}`">
          <template #prepend>
            <v-avatar size="38" class="order-avatar">
              <v-icon size="18">mdi-file-document</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="text-body-2 font-weight-medium">
            {{ o.customer }}
          </v-list-item-title>

          <v-list-item-subtitle class="text-caption">
            {{ o.invoice_number }}
          </v-list-item-subtitle>

          <template #append>
            <div class="text-right">
              <div class="text-body-2 font-weight-bold">₹ {{ o.amount }}</div>
              <v-chip
                size="x-small"
                :color="statusColor(o.payment_status)"
                variant="flat"
              >
                {{ o.payment_status }}
              </v-chip>
            </div>
          </template>
        </v-list-item>

        <v-list-item v-if="!recentOrders.length && !loading">
          <v-list-item-title class="text-caption text-medium-emphasis">
            No recent orders
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- FAB -->
    <v-fab
      icon="mdi-plus"
      color="primary"
      location="bottom end"
      app
      size="large"
      elevation="12"
      @click="onNewSale"
    />
  </v-container>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useDashboard } from "@/composables/pos/useDashboard";

const router = useRouter();

const { stats, transactions, recentOrders, loading, loadDashboard } = useDashboard();

onMounted(loadDashboard);

/* ACTIONS */
const onNewSale = () => router.push("/pos/system");
const OnProduct = () => router.push("/pos/products");
const OnCustomers = () => router.push("/pos/customers");
const OnOrder = () => router.push("/pos/orders");
const OnPayments = () => router.push("/pos/payments");
const OnSettings = () => router.push("/pos/settings");

const statusColor = (s: string) => {
  if (s === "Paid") return "green";
  if (s === "Partial") return "orange";
  return "red";
};

const actions = [
  { title: "New Sale", icon: "mdi-plus", action: onNewSale },
  { title: "Products", icon: "mdi-package-variant", action: OnProduct },
  { title: "Parties", icon: "mdi-account-group", action: OnCustomers },
  { title: "Invoices", icon: "mdi-chart-box", action: OnOrder },
  { title: "Payments", icon: "mdi-qrcode-scan", action: OnPayments },
  { title: "Settings", icon: "mdi-cog", action: OnSettings },
];
</script>

<style scoped>
.stat-card {
  padding: 22px;
}
.section-title {
  margin: 28px 0 14px;
  font-size: 14px;
  font-weight: 600;
}
.action-card {
  text-align: center;
  padding: 18px 8px;
}
.action-avatar,
.txn-avatar,
.order-avatar {
  background: #f1f5f9;
}
</style>
