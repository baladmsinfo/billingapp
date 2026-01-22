<template>
  <v-container fluid class="pa-3 list-bg">

    <!-- FILTER TOGGLE ICON -->
    <v-row class="mb-2" align="center">
      <v-col cols="12" class="d-flex justify-end">
        <v-btn icon @click="showFilters = !showFilters">
          <v-icon>mdi-filter-variant</v-icon>
        </v-btn>
      </v-col>
    </v-row>

    <!-- FILTER PANEL -->
    <v-slide-y-transition>
      <v-row v-if="showFilters" class="mb-4" align="center" dense>
        
        <!-- Search -->
        <v-col cols="12" sm="3">
          <v-text-field
            v-model="filterSearch"
            label="Search Invoice #"
            dense
            clearable
            outlined
            prepend-inner-icon="mdi-magnify"
          />
        </v-col>

        <!-- Status -->
        <v-col cols="6" sm="2">
          <v-select
            v-model="filterStatus"
            :items="statusOptions"
            label="Status"
            dense
            clearable
            outlined
          />
        </v-col>

        <!-- Type -->
        <v-col cols="6" sm="2">
          <v-select
            v-model="filterType"
            :items="typeOptions"
            label="Type"
            dense
            clearable
            outlined
          />
        </v-col>

        <!-- Date Range -->
        <v-col cols="12" sm="5">
          <v-menu
            v-model="dateMenu"
            :close-on-content-click="false"
            transition="scale-transition"
            max-width="400"
            min-width="290"
            offset-y
          >
            <template #activator="{ props: menuProps }">
              <v-text-field
                v-bind="menuProps"
                v-model="dateText"
                label="Filter by Date"
                prepend-inner-icon="mdi-calendar-range"
                readonly
                dense
                outlined
              />
            </template>

            <v-card>
              <v-date-picker
                v-model="filterDate"
                range
                scrollable
                color="primary"
              >
                <v-spacer></v-spacer>
                <v-card-actions>
                  <v-btn text color="primary" @click="dateMenu = false">Cancel</v-btn>
                  <v-btn text color="primary" @click="applyDateFilter">Apply</v-btn>
                </v-card-actions>
              </v-date-picker>
            </v-card>
          </v-menu>
        </v-col>

      </v-row>
    </v-slide-y-transition>

    <!-- INVOICE LIST -->
    <v-row>
      <v-col
        v-for="invoice in filteredInvoices"
        :key="invoice.id"
        cols="12"
      >
        <v-card
          rounded="2xl"
          elevation="2"
          class="invoice-card"
          ripple
          role="button"
          tabindex="0"
          @click="onInvoiceClick(invoice)"
        >
          <!-- HEADER -->
          <div class="header">
            <div>
              <div class="number">
                #{{ invoice.invoice_number || "—" }}
              </div>
              <div class="meta">
                {{ new Date(invoice.date).toLocaleDateString() }}
                • {{ invoice.type }}
              </div>
            </div>

            <v-chip
              size="small"
              :color="statusColor(invoice.status)"
              variant="flat"
            >
              <v-icon start size="14">
                {{ statusIcon(invoice.status) }}
              </v-icon>
              {{ invoice.status }}
            </v-chip>
          </div>

          <v-divider class="my-3" />

          <!-- FOOTER -->
          <div class="footer">
            <div>
              <div class="label">Total</div>
              <div class="amount">
                ₹{{ Number(invoice.total_amount).toFixed(2) }}
              </div>
            </div>

            <v-icon>mdi-chevron-right</v-icon>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- LOADING -->
    <v-row v-if="loading">
      <v-col cols="12">
        <v-skeleton-loader type="article" />
      </v-col>
    </v-row>

    <!-- LOAD MORE -->
    <v-row v-if="hasMore && !loading">
      <v-col cols="12">
        <v-btn
          block
          rounded="xl"
          size="large"
          variant="tonal"
          @click="$emit('loadMore')"
        >
          Load more
        </v-btn>
      </v-col>
    </v-row>

    <!-- EMPTY -->
    <v-row v-if="!loading && filteredInvoices.length === 0">
      <v-col cols="12" class="text-center py-12">
        <v-icon size="56" color="grey">
          mdi-receipt-text-outline
        </v-icon>
        <div class="text-grey mt-2">
          No invoices found
        </div>
      </v-col>
    </v-row>

  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";

const props = defineProps<{
  invoices: any[];
  loading: boolean;
  hasMore: boolean;
}>();

const emit = defineEmits<{
  (e: "loadMore"): void;
}>();

const router = useRouter();

// FILTER PANEL TOGGLE
const showFilters = ref(false);

// FILTERS
const filterStatus = ref<string | null>(null);
const filterType = ref<string | null>(null);
const filterSearch = ref<string>("");
const filterDate = ref<{ start?: string; end?: string }>({});
const dateMenu = ref(false);
const dateText = ref("");

// OPTIONS
const statusOptions = ["PAID", "PARTIAL", "PAYLATER", "CANCELLED"];
const typeOptions = ["SALE", "REFUND", "EXCHANGE"];

// APPLY DATE FILTER
const applyDateFilter = () => {
  if (filterDate.value.start && filterDate.value.end) {
    dateText.value = `${new Date(filterDate.value.start).toLocaleDateString()} - ${new Date(filterDate.value.end).toLocaleDateString()}`;
  } else {
    dateText.value = "";
  }
  dateMenu.value = false;
};

// FILTERED INVOICES
const filteredInvoices = computed(() => {
  return props.invoices.filter(inv => {
    const matchesStatus = filterStatus.value ? inv.status === filterStatus.value : true;
    const matchesType = filterType.value ? inv.type === filterType.value : true;
    const matchesSearch = filterSearch.value
      ? inv.invoice_number?.toLowerCase().includes(filterSearch.value.toLowerCase())
      : true;

    const matchesDate = filterDate.value.start && filterDate.value.end
      ? inv.date >= new Date(filterDate.value.start).getTime() &&
        inv.date <= new Date(filterDate.value.end).getTime()
      : true;

    return matchesStatus && matchesType && matchesSearch && matchesDate;
  });
});

// STATUS COLOR / ICON
function statusColor(status: string) {
  switch (status) {
    case "PAID": return "green";
    case "PARTIAL": return "orange";
    case "PAYLATER": return "blue";
    case "CANCELLED": return "red";
    default: return "grey";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "PAID": return "mdi-check-circle";
    case "PARTIAL": return "mdi-circle-half-full";
    case "PAYLATER": return "mdi-clock-outline";
    case "CANCELLED": return "mdi-close-circle";
    default: return "mdi-receipt";
  }
}

// ROW CLICK → NAVIGATE
const onInvoiceClick = (invoice: any) => {
  router.push(`/pos/orders/${invoice.id}`);
};
</script>

<style scoped>
.list-bg {
  background: #f7f8fa;
  min-height: 100vh;
}

.invoice-card {
  padding: 16px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
}

.invoice-card:active {
  transform: scale(0.97);
}

.header {
  display: flex;
  justify-content: space-between;
}

.number {
  font-weight: 600;
}

.meta {
  font-size: 12px;
  color: #777;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 12px;
  color: #777;
}

.amount {
  font-size: 20px;
  font-weight: 700;
}
</style>
