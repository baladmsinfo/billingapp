<template>
    <v-container fluid class="pa-4 pa-md-6">
        <v-row dense>
            <!-- 🏷️ Header -->
            <v-col cols="12">
                <div class="mb-4">
                    <h2 class="text-h6 font-weight-bold">Offline Dashboard</h2>
                    <p class="text-caption text-medium-emphasis">
                        Data from local device (offline mode)
                    </p>
                </div>
            </v-col>

            <!-- 💰 Cashflow -->
            <v-col cols="12">
                <v-card elevation="2" class="pa-4">
                    <div class="d-flex justify-space-between align-center mb-3">
                        <h3 class="text-subtitle-1 font-weight-bold">Cashflow</h3>
                        <v-select v-model="periods.cashflow" :items="periodOptions" density="compact" hide-details
                            variant="outlined" style="max-width: 140px" @update:modelValue="loadCashflow" />
                    </div>

                    <client-only>
                        <apexchart type="line" height="280" :options="cashflowOptions" :series="cashflowSeries" />
                    </client-only>
                </v-card>
            </v-col>

            <!-- 🧾 Sales -->
            <v-col cols="12" md="6">
                <v-card elevation="2" class="pa-4">
                    <div class="d-flex justify-space-between align-center mb-2">
                        <h3 class="text-subtitle-1 font-weight-bold">Sales</h3>
                        <v-select v-model="periods.sales" :items="periodOptions" density="compact" hide-details
                            variant="outlined" style="max-width: 120px" @update:modelValue="loadSales" />
                    </div>

                    <div class="text-h6 font-weight-bold">
                        {{ formatAmount(sales.paid) }}
                    </div>
                    <div class="text-caption">
                        Unpaid: {{ formatAmount(sales.unpaid) }}
                    </div>

                    <v-progress-linear :model-value="salesProgress" height="6" color="primary"
                        class="mt-3 rounded-pill" />
                </v-card>
            </v-col>

            <!-- 📦 Purchases -->
            <v-col cols="12" md="6">
                <v-card elevation="2" class="pa-4">
                    <div class="d-flex justify-space-between align-center mb-2">
                        <h3 class="text-subtitle-1 font-weight-bold">Purchases</h3>
                        <v-select v-model="periods.purchases" :items="periodOptions" density="compact" hide-details
                            variant="outlined" style="max-width: 120px" @update:modelValue="loadPurchases" />
                    </div>

                    <div class="text-h6 font-weight-bold">
                        {{ formatAmount(purchases.paid) }}
                    </div>
                    <div class="text-caption">
                        Unpaid: {{ formatAmount(purchases.unpaid) }}
                    </div>

                    <v-progress-linear :model-value="purchaseProgress" height="6" color="pink"
                        class="mt-3 rounded-pill" />
                </v-card>
            </v-col>

            <!-- 📉 Profit & Loss -->
            <v-col cols="12" md="6">
                <v-card elevation="2" class="pa-4">
                    <div class="d-flex justify-space-between align-center mb-3">
                        <h3 class="text-subtitle-1 font-weight-bold">Profit & Loss</h3>
                        <v-select v-model="periods.profitloss" :items="periodOptions" density="compact" hide-details
                            variant="outlined" style="max-width: 140px" @update:modelValue="loadProfitLoss" />
                    </div>

                    <client-only>
                        <apexchart type="bar" height="280" :options="profitLossOptions" :series="profitLossSeries" />
                    </client-only>
                </v-card>
            </v-col>

            <!-- 🍽 Expense -->
            <v-col cols="12" md="6">
                <v-card elevation="2" class="pa-4">
                    <div class="d-flex justify-space-between align-center mb-3">
                        <h3 class="text-subtitle-1 font-weight-bold">Expenses</h3>
                        <v-select v-model="periods.expense" :items="periodOptions" density="compact" hide-details
                            variant="outlined" style="max-width: 120px" @update:modelValue="loadExpense" />
                    </div>

                    <client-only>
                        <apexchart type="donut" height="280" :options="expenseOptions" :series="expenseSeries" />
                    </client-only>

                    <div class="text-center text-caption mt-2">
                        Total: <b>{{ formatAmount(expenseTotal) }}</b>
                    </div>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useDashboard } from "@/composables/pos/useDashboard"
import { useExpense } from "@/composables/pos/useExpense"

const { $formatPrice } = useNuxtApp()

const companyId = "LOCAL_COMPANY"

/* ---------------- COMPOSABLES ---------------- */
const dashboard = useDashboard(companyId)
const expense = useExpense(companyId)

/* ---------------- STATE ---------------- */
const periods = ref({
  cashflow: "thisYear",
  sales: "thisYear",
  purchases: "thisYear",
  profitloss: "thisYear",
  expense: "thisYear",
})

const periodOptions = [
  { title: "This Year", value: "thisYear" },
  { title: "This Quarter", value: "thisQuarter" },
  { title: "This Month", value: "thisMonth" },
  { title: "Year to Date", value: "yearToDate" },
]

const sales = ref({ paid: 0, unpaid: 0 })
const purchases = ref({ paid: 0, unpaid: 0 })
const cashflow = ref({ labels: [], inflow: [], outflow: [] })
const profitloss = ref({ labels: [], values: [] })

const expenseData = ref<any[]>([])
const expenseTotal = ref(0)

/* ---------------- LOADERS ---------------- */
const loadCashflow = async () => {
  cashflow.value = await dashboard.getCashflow(periods.value.cashflow)
}

const loadSales = async () => {
  sales.value = await dashboard.getSalesSummary(periods.value.sales)
}

const loadPurchases = async () => {
  purchases.value = await dashboard.getPurchaseSummary(periods.value.purchases)
}

const loadProfitLoss = async () => {
  profitloss.value = await dashboard.getProfitLoss(periods.value.profitloss)
}

const loadExpense = async () => {
  const res = await expense.getExpenseChart(periods.value.expense)
  expenseData.value = res.items
  expenseTotal.value = res.total
}

/* ---------------- HELPERS ---------------- */
const formatAmount = (v: number) => $formatPrice(v)

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
  { name: "Profit / Loss", data: profitloss.value.values },
])

const expenseSeries = computed(() =>
  expenseData.value.map(i => i.total)
)

/* ---------------- CHART OPTIONS ---------------- */
const cashflowOptions = computed(() => ({
  chart: { toolbar: { show: false } },
  stroke: { curve: "smooth", width: 3 },
  xaxis: { categories: cashflow.value.labels },
  dataLabels: { enabled: false },
}))

const profitLossOptions = computed(() => ({
  chart: { toolbar: { show: false } },
  xaxis: { categories: profitloss.value.labels },
  dataLabels: { enabled: false },
}))

const expenseOptions = computed(() => ({
  labels: expenseData.value.map(i => i.category),
  legend: { position: "bottom" },
}))

/* ---------------- INIT ---------------- */
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