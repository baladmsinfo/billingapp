<template>
  <v-container fluid class="dashboard-root">

    <!-- HEADER -->
    <div class="header-wrap">
      <div>
        <h1 class="title">Offline Dashboard</h1>
        <p class="subtitle">Data from local device</p>
      </div>
      <v-chip size="small" class="status-chip">Offline</v-chip>
    </div>

    <!-- GRID -->
    <v-row class="dashboard-grid">

      <!-- CASHFLOW -->
      <v-col cols="12">
        <v-card class="card">
          <div class="card-header">
            <h3>Cashflow</h3>
            <v-select v-model="periods.cashflow" :items="periodOptions"
              density="compact" hide-details variant="outlined"
              class="select" @update:modelValue="loadCashflow" />
          </div>

          <v-skeleton-loader v-if="loading.cashflow" type="image" height="300" />

          <client-only v-else>
            <apexchart type="line" height="320"
              :options="cashflowOptions" :series="cashflowSeries" />
          </client-only>
        </v-card>
      </v-col>

      <!-- SALES -->
      <v-col cols="12" md="6">
        <v-card class="card">
          <div class="card-header">
            <h3>Sales</h3>
            <v-select v-model="periods.sales" :items="periodOptions"
              density="compact" hide-details variant="outlined"
              class="select" @update:modelValue="loadSales" />
          </div>

          <v-skeleton-loader v-if="loading.sales" type="text" />

          <div v-else>
            <div class="big-number primary-text">
              {{ animatedSales }}
            </div>
            <div class="sub-text">
              Unpaid: {{ formatAmount(sales.unpaid) }}
            </div>

            <v-progress-linear :model-value="salesProgress"
              height="6" color="primary" class="mt-5 rounded-pill" />
          </div>
        </v-card>
      </v-col>

      <!-- PURCHASE -->
      <v-col cols="12" md="6">
        <v-card class="card">
          <div class="card-header">
            <h3>Purchases</h3>
            <v-select v-model="periods.purchases" :items="periodOptions"
              density="compact" hide-details variant="outlined"
              class="select" @update:modelValue="loadPurchases" />
          </div>

          <v-skeleton-loader v-if="loading.purchases" type="text" />

          <div v-else>
            <div class="big-number blue-text">
              {{ animatedPurchases }}
            </div>
            <div class="sub-text">
              Unpaid: {{ formatAmount(purchases.unpaid) }}
            </div>

            <v-progress-linear :model-value="purchaseProgress"
              height="6" color="info" class="mt-5 rounded-pill" />
          </div>
        </v-card>
      </v-col>

      <!-- PROFIT -->
      <v-col cols="12" md="6">
        <v-card class="card">
          <div class="card-header">
            <h3>Profit & Loss</h3>
            <v-select v-model="periods.profitloss" :items="periodOptions"
              density="compact" hide-details variant="outlined"
              class="select" @update:modelValue="loadProfitLoss" />
          </div>

          <v-skeleton-loader v-if="loading.profit" type="image" height="280" />

          <client-only v-else>
            <apexchart type="bar" height="300"
              :options="profitLossOptions" :series="profitLossSeries" />
          </client-only>
        </v-card>
      </v-col>

      <!-- EXPENSE -->
      <v-col cols="12" md="6">
        <v-card class="card">
          <div class="card-header">
            <h3>Expenses</h3>
            <v-select v-model="periods.expense" :items="periodOptions"
              density="compact" hide-details variant="outlined"
              class="select" @update:modelValue="loadExpense" />
          </div>

          <v-skeleton-loader v-if="loading.expense" type="image" height="260" />

          <client-only v-else>
            <apexchart type="donut" height="260"
              :options="expenseOptions" :series="expenseSeries" />
          </client-only>

          <div class="total" v-if="!loading.expense">
            Total: {{ animatedExpense }}
          </div>
        </v-card>
      </v-col>

    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useDashboard } from "@/composables/pos/useDashboard"
import { useExpense } from "@/composables/pos/useExpense"

const { $formatPrice } = useNuxtApp()

const companyId = "LOCAL_COMPANY"

const dashboard = useDashboard(companyId)
const expense = useExpense(companyId)

/* STATE */
const periods = ref({
  cashflow: "thisYear",
  sales: "thisYear",
  purchases: "thisYear",
  profitloss: "thisYear",
  expense: "thisYear",
})

const periodOptions = [
  { title: "This Year", value: "thisYear" },
  { title: "This Month", value: "thisMonth" },
  { title: "This Quarter", value: "thisQuarter" },
]

const loading = ref({
  cashflow: true,
  sales: true,
  purchases: true,
  profit: true,
  expense: true,
})

const sales = ref({ paid: 0, unpaid: 0 })
const purchases = ref({ paid: 0, unpaid: 0 })
const cashflow = ref({ labels: [], inflow: [], outflow: [] })
const profitloss = ref({ labels: [], values: [] })

const expenseData = ref<any[]>([])
const expenseTotal = ref(0)

/* 🔥 ANIMATION */
const animateValue = (target: number, refVar: any) => {
  let start = 0
  const duration = 600
  const step = target / (duration / 16)

  const timer = setInterval(() => {
    start += step
    if (start >= target) {
      refVar.value = $formatPrice(target)
      clearInterval(timer)
    } else {
      refVar.value = $formatPrice(Math.floor(start))
    }
  }, 16)
}

const animatedSales = ref("0")
const animatedPurchases = ref("0")
const animatedExpense = ref("0")

watch(() => sales.value.paid, v => animateValue(v, animatedSales))
watch(() => purchases.value.paid, v => animateValue(v, animatedPurchases))
watch(() => expenseTotal.value, v => animateValue(v, animatedExpense))

/* LOADERS */
const loadCashflow = async () => {
  loading.value.cashflow = true
  cashflow.value = await dashboard.getCashflow(periods.value.cashflow)
  loading.value.cashflow = false
}

const loadSales = async () => {
  loading.value.sales = true
  sales.value = await dashboard.getSalesSummary(periods.value.sales)
  loading.value.sales = false
}

const loadPurchases = async () => {
  loading.value.purchases = true
  purchases.value = await dashboard.getPurchaseSummary(periods.value.purchases)
  loading.value.purchases = false
}

const loadProfitLoss = async () => {
  loading.value.profit = true
  profitloss.value = await dashboard.getProfitLoss(periods.value.profitloss)
  loading.value.profit = false
}

const loadExpense = async () => {
  loading.value.expense = true
  const res = await expense.getExpenseChart(periods.value.expense)
  expenseData.value = res.items
  expenseTotal.value = res.total
  loading.value.expense = false
}

/* COMPUTED */
const formatAmount = (v:number)=>$formatPrice(v)

const salesProgress = computed(() => {
  const t = sales.value.paid + sales.value.unpaid
  return t ? (sales.value.paid / t) * 100 : 0
})

const purchaseProgress = computed(() => {
  const t = purchases.value.paid + purchases.value.unpaid
  return t ? (purchases.value.paid / t) * 100 : 0
})

const cashflowSeries = computed(() => [
  { name: "Inflow", data: cashflow.value.inflow },
  { name: "Outflow", data: cashflow.value.outflow },
])

const profitLossSeries = computed(() => [
  { name: "Profit", data: profitloss.value.values },
])

const expenseSeries = computed(() =>
  expenseData.value.map(i => i.total)
)

/* 🎯 GRADIENT CHARTS */
const cashflowOptions = {
  chart: { toolbar: { show: false } },
  stroke: { curve: "smooth", width: 3 },
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.05,
    }
  },
  colors: ["#4f46e5", "#ef4444"],
  xaxis: { categories: cashflow.value.labels }
}

const profitLossOptions = {
  chart: { toolbar: { show: false } },
  colors: ["#22c55e"],
  plotOptions: {
    bar: { borderRadius: 6 }
  }
}

const expenseOptions = {
  legend: { position: "bottom" }
}

/* INIT */
onMounted(async () => {
  await Promise.all([
    loadCashflow(),
    loadSales(),
    loadPurchases(),
    loadProfitLoss(),
    loadExpense(),
  ])
})
</script>

<style scoped>
.dashboard-root {
  background: #f8fafc;
  min-height: 100vh;
  padding: 24px;
}

/* 🔥 HEADER spacing fixed */
.header-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.title {
  font-size: 22px;
  font-weight: 700;
}

.subtitle {
  font-size: 13px;
  color: #6b7280;
}

.status-chip {
  background: #eef2ff;
  color: #4f46e5;
}

/* 🔥 GRID GAP FIX */
.dashboard-grid {
  row-gap: 20px;
}

/* 🔥 CARD FIX */
.card {
  border-radius: 16px;
  padding: 24px; /* ⬅️ more breathing space */
  background: #fff;
  border: 1px solid #eef2f7;
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
  transition: 0.25s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(0,0,0,0.06);
}

/* HEADER */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

/* SELECT */
.select {
  max-width: 130px;
}

/* TEXT */
.big-number {
  font-size: 28px;
  font-weight: 700;
  margin-top: 8px;
}

.primary-text {
  color: #4f46e5;
}

.blue-text {
  color: #0ea5e9;
}

.sub-text {
  font-size: 13px;
  color: #6b7280;
  margin-top: 4px;
}

/* TOTAL */
.total {
  text-align: center;
  margin-top: 14px;
  font-size: 13px;
  color: #374151;
}
</style>