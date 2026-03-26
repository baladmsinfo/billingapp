<!-- FULL DESKTOP UI ORDER PAGE COMPONENT WILL BE INSERTED HERE -->
<template>
  <!-- DESKTOP OPTIMIZED ORDERS PAGE -->
  <v-container fluid class="pa-4">

    <!-- ========================= HEADER + FILTER BAR ========================= -->
    <v-card class="pa-4 mb-4 rounded-xl" elevation="2">
      <div class="d-flex justify-space-between align-center mb-4">
        <div class="text-h5 font-weight-bold">Orders</div>

        <v-btn color="primary" class="rounded-lg" @click="openCreateInvoice">
          <v-icon start>mdi-plus</v-icon>
          Create Invoice
        </v-btn>
      </div>

      <!-- FILTER ROW (DESKTOP FRIENDLY) -->
      <v-row dense>
        <v-col cols="12" sm="3">
          <v-text-field v-model="filterSearch" label="Search Invoice #" clearable outlined density="comfortable"
            prepend-inner-icon="mdi-magnify" />
        </v-col>

        <v-col cols="6" sm="2">
          <v-select v-model="filterStatus" :items="statusOptions" label="Status" clearable outlined
            density="comfortable" />
        </v-col>

        <v-col cols="6" sm="2">
          <v-select v-model="filterType" :items="typeOptions" label="Type" clearable outlined density="comfortable" />
        </v-col>

        <v-col cols="12" sm="5">
          <v-menu v-model="dateMenu" :close-on-content-click="false" transition="scale-transition" max-width="400"
            min-width="290" offset-y>
            <template #activator="{ props: activatorProps }">
              <v-text-field v-bind="activatorProps" v-model="dateText" label="Filter by Date Range"
                prepend-inner-icon="mdi-calendar-range" readonly clearable outlined density="comfortable"
                @click:clear="clearDateFilter" />
            </template>

            <v-card>
              <v-date-picker v-model="filterDate" range scrollable color="primary" />

              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn text color="primary" @click="dateMenu = false">Cancel</v-btn>
                <v-btn text color="primary" @click="applyDateFilter">Apply</v-btn>
              </v-card-actions>
            </v-card>
          </v-menu>
        </v-col>
      </v-row>
    </v-card>

    <!-- ========================= DESKTOP DATA TABLE ========================= -->
    <v-card class="rounded-xl" elevation="2">
      <v-data-table :headers="headers" :items="filteredInvoices" :loading="loading" class="rounded-xl"
        item-key="id" :items-per-page="10" show-current-page show-first-last-page>

        <!-- STATUS CHIP -->
        <template #item.status="{ item }">
          <v-chip size="small" :color="statusColor(item.status)" variant="flat">
            <v-icon start size="14">{{ statusIcon(item.status) }}</v-icon>
            {{ item.status }}
          </v-chip>
        </template>

        <!-- TOTAL AMOUNT -->
        <template #item.total_amount="{ item }">
          ₹{{ Number(item.total_amount).toFixed(2) }}
        </template>

        <!-- ACTION COLUMN -->
        <template #item.actions="{ item }">
          <v-btn icon size="small" @click="onInvoiceClick(item)">
            <v-icon>mdi-eye</v-icon>
          </v-btn>
        </template>
      </v-data-table>

      <!-- LOAD MORE -->
      <div v-if="hasMore && !loading" class="text-center py-4">
        <v-btn variant="tonal" @click="$emit('loadMore')">Load More</v-btn>
      </div>
    </v-card>

    <!-- ========================= CREATE INVOICE DIALOG ========================= -->
    <!-- (UNCHANGED LOGIC — UI IMPROVED ONLY) -->
    <!-- FULL DIALOG CODE PASTED EXACTLY FROM ORIGINAL SO LOGIC REMAINS -->

    <v-dialog v-model="createDialog" max-width="900" scrollable>
      <v-card class="pa-6 rounded-xl dialog-scroll" elevation="8" style="max-height:95vh; overflow:auto;">

        <div class="text-h6 mb-3 font-weight-bold">Create Invoice</div>
        <v-divider class="mb-3" />

        <!-- TOP FIELDS (GRID DESKTOP) -->
        <v-row dense>
          <v-col cols="12" sm="4">
            <v-select label="Invoice Type" :items="invoiceTypes" v-model="form.type" density="comfortable"
              variant="outlined" @change="loadPartyList" />
          </v-col>

          <v-col cols="12" sm="8">
            <v-autocomplete label="Select Party / Vendor" :items="parties" item-title="name" item-value="id"
              v-model="form.party_id" density="comfortable" variant="outlined" clearable />
          </v-col>

          <v-col cols="12" sm="6">
            <v-text-field type="date" label="Invoice Date" v-model="form.date" density="comfortable"
              variant="outlined" />
          </v-col>

          <v-col cols="12" sm="6">
            <v-text-field type="date" label="Due Date" v-model="form.due_date" density="comfortable"
              variant="outlined" />
          </v-col>
        </v-row>

        <v-textarea label="Notes (optional)" v-model="form.notes" variant="outlined" rows="2"
          density="comfortable" class="mt-2" />

        <v-divider class="my-4" />

        <!-- ===================== ITEM ROWS ===================== -->
        <div class="text-subtitle-2 font-weight-medium mb-2">Invoice Items</div>

        <v-card v-for="(row, index) in form.items" :key="index" class="pa-4 mb-4 rounded-lg bg-grey-lighten-4">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-autocomplete label="Select Product" :items="products" item-title="product_name"
                item-value="product_id" v-model="row.product_id" density="comfortable" variant="outlined"
                @update:model-value="(id) => loadItemOptionsForRow(id, index)" />
            </v-col>

            <v-col cols="12" sm="6" v-if="row.itemOptions && row.itemOptions.length">
              <v-autocomplete label="Select Item / Variant" :items="row.itemOptions" item-title="fullName"
                item-value="item_id" v-model="row.item_id" density="comfortable" variant="outlined"
                @update:model-value="(id) => assignSelectedItem(id, index)" />
            </v-col>

            <v-col cols="6">
              <v-text-field label="Qty" type="number" v-model.number="row.quantity" density="comfortable"
                variant="outlined" @input="calcTotal" />
            </v-col>

            <v-col cols="6">
              <v-text-field label="Price" type="number" v-model.number="row.price" density="comfortable"
                variant="outlined" @input="calcTotal" />
            </v-col>

            <v-col cols="12">
              <v-select label="Tax Rate" :items="taxRates" item-title="name" item-value="id"
                v-model="row.tax_rate_id" density="comfortable" variant="outlined"
                @update:model-value="(id) => assignTaxRate(id, index)" />
            </v-col>
          </v-row>

          <div class="text-right mt-1 text-caption text-red" style="cursor:pointer" @click="removeItem(index)">
            Remove
          </div>
        </v-card>

        <v-btn color="primary" variant="outlined" class="mb-4" block @click="addNewItemRow">
          + Add Another Item
        </v-btn>

        <!-- TOTAL SUMMARY (DESKTOP WIDE LAYOUT) -->
        <v-card class="pa-4 rounded-xl mt-4" elevation="1">
          <v-row>
            <v-col cols="6">
              <div class="text-body-2 text-grey-darken-1 mb-1">Sub Total</div>
              <div class="text-h6 font-weight-bold">₹{{ subTotal.toFixed(2) }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-body-2 text-grey-darken-1 mb-1">Total Tax</div>
              <div class="text-h6 font-weight-bold">₹{{ Number(taxAmount).toFixed(2) }}</div>
            </v-col>
          </v-row>

          <v-divider class="my-2" />

          <div class="d-flex justify-space-between align-center">
            <span class="text-h6 font-weight-bold">Grand Total</span>
            <span class="text-h4 font-weight-bold" style="color:#1976d2">₹{{ form.total_amount.toFixed(2) }}</span>
          </div>
        </v-card>

        <v-btn block color="primary" class="py-3 rounded-lg mt-4" @click="submitInvoice">
          Create Invoice
        </v-btn>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { DEFAULT_COMPANY_ID } from "@/constants/company";
import { useInvoice } from "@/composables/pos/useInvoices";

const company_id = String(DEFAULT_COMPANY_ID);

const createDialog = ref(false);
const { createInvoice, getAllTaxRates, getPartiesByType, getAllProducts } = useInvoice();

const invoiceTypes = ["SALE", "POS", "PURCHASE", "RETURN", "EXPENSE", "OTHER"];

const parties = ref([]);
const products = ref([]);

const taxRates = ref([]);

const loadTaxRates = async () => {
  taxRates.value = await getAllTaxRates(company_id);

  console.log("Loaded Tax Rates:", taxRates.value);
  
};

const form = ref({
  type: "SALE",
  party_id: "",
  date: new Date().toISOString().slice(0, 10),
  due_date: "",
  notes: "",
  items: [], // <-- dynamic rows live here
  total_amount: 0,
});

const addNewItemRow = () => {
  form.value.items.push({
    product_id: "",
    item_id: "",
    quantity: 1,
    price: 0,
    tax_rate_id: "",   
    tax_percent: 0,    
    itemOptions: [],
  });
};

/* ==========================
   REMOVE ROW
   ========================== */
const removeItem = (i: number) => {
  form.value.items.splice(i, 1);
  calcTotal();
};

const assignTaxRate = (id, index) => {
  const row = form.value.items[index];
  const tax = taxRates.value.find(t => t.id === id);

  if (tax) {
    row.tax_rate_id = tax.id;
    row.tax_percent = tax.percent;
  }

  calcTotal();
};

/* ==========================
   LOAD ITEM OPTIONS FOR ONE ROW
   ========================== */
const loadItemOptionsForRow = (product_id, index) => {
  const row = form.value.items[index];
  const product = products.value.find(p => p.product_id === product_id);

  if (!product) {
    row.itemOptions = [];
    row.item_id = "";
    row.price = 0;
    calcTotal();
    return;
  }

  row.itemOptions = product.items.map(i => ({
    item_id: i.item_id,
    fullName: `${i.variant || i.sku || "Variant"} — ₹${i.price}`,
    price: i.price
  }));

  // reset item + price when product changes
  row.item_id = "";
  row.price = 0;
  calcTotal();
};

const subTotal = computed(() => {
  return form.value.items.reduce((sum, row) => {
    return sum + (Number(row.quantity) || 0) * (Number(row.price) || 0);
  }, 0);
});

const taxAmount = computed(() => {
  let tax = 0;

  for (const row of form.value.items) {
    const qty = Number(row.quantity) || 0;
    const price = Number(row.price) || 0;
    const taxPercent = Number(row.tax_percent || 0);

    const sub = qty * price;
    tax += (sub * taxPercent) / 100;
  }

  return tax.toFixed(2);
});


/* ==========================
   ASSIGN SELECTED ITEM/VALUE
   ========================== */
const assignSelectedItem = (item_id, index) => {
  const row = form.value.items[index];
  const option = row.itemOptions.find(i => i.item_id === item_id);

  if (option) {
    row.price = option.price;
  }

  calcTotal();
};

const calcTotal = () => {
  let total = 0;

  for (const row of form.value.items) {
    const qty = Number(row.quantity) || 0;
    const price = Number(row.price) || 0;

    const sub = qty * price;
    const tax = (sub * Number(row.tax_percent || 0)) / 100;

    total += sub + tax;
  }

  form.value.total_amount = total;
};


/* ==========================
   LOAD PARTY LIST
   ========================== */
const loadPartyList = async () => {
  const type = form.value.type === "PURCHASE" ? "VENDOR" : "CUSTOMER";
  parties.value = await getPartiesByType(company_id, type);
};

/* ==========================
   LOAD PRODUCTS
   ========================== */
const loadProducts = async () => {
  products.value = await getAllProducts(company_id);

};

/* ==========================
   OPEN CREATE INVOICE DIALOG
   ========================== */
const openCreateInvoice = async () => {
  await loadPartyList();
  await loadProducts();
  await loadTaxRates();

  form.value.items = [];
  addNewItemRow();       // start with one row
  createDialog.value = true;
};

const submitInvoice = async () => {
  // validation
  if (!form.value.party_id) {
    alert("Please select a customer/vendor");
    return;
  }

  if (form.value.items.length === 0) {
    alert("Please add at least one invoice item");
    return;
  }

  for (const [i, row] of form.value.items.entries()) {
    if (!row.product_id || !row.item_id) {
      alert(`Item row ${i + 1} is incomplete. Select product and variant.`);
      return;
    }
  }

  const payload = {
    company_id,
    type: form.value.type,
    party_id: form.value.party_id,
    items: form.value.items.map(r => ({
      product_id: r.product_id,
      item_id: r.item_id,
      quantity: r.quantity,
      price: r.price,
      tax_rate_id: r.tax_rate_id,
      tax_percent: r.tax_percent,
    })),
    total_amount: Number(form.value.total_amount),
    due_date: form.value.due_date ? new Date(form.value.due_date).getTime() : null,
    notes: form.value.notes,
  };

  console.log("Creating invoice with payload:", payload);

  try {
    const id = await createInvoice(payload);
    console.log("Invoice Created:", id);
    createDialog.value = false;
  } catch (err) {
    console.error("Failed to create invoice", err);
    alert("Failed to create invoice. Check console for details.");
  }
};

const props = defineProps<{
  invoices: any[];
  loading: boolean;
  hasMore: boolean;
}>();

const emit = defineEmits(["loadMore", "filterChanged"]);
const router = useRouter();

const showFilters = ref(false);
const filterStatus = ref<string | null>(null);
const filterType = ref<string | null>(null);
const filterSearch = ref("");
const filterDate = ref<string[]>([]);
const dateMenu = ref(false);
const dateText = ref("");

const statusOptions = ["PAID", "PARTIAL", "PAYLATER", "CANCELLED"];
const typeOptions = ["SALE", "REFUND", "EXCHANGE"];

const applyDateFilter = () => {
  if (filterDate.value.length === 2) {
    const [start, end] = filterDate.value;
    dateText.value = `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;
  }
  dateMenu.value = false;
};

const filteredInvoices = computed(() => {
  return props.invoices.filter(inv => {
    const matchesStatus = filterStatus.value ? inv.status === filterStatus.value : true;
    const matchesType = filterType.value ? inv.type === filterType.value : true;
    const matchesSearch = filterSearch.value
      ? inv.invoice_number?.toLowerCase().includes(filterSearch.value.toLowerCase())
      : true;

    const matchesDate = (() => {
      if (filterDate.value.length !== 2) return true;

      const [startStr, endStr] = filterDate.value;
      const start = new Date(startStr).getTime();
      const end = new Date(endStr).getTime();

      return inv.date >= start && inv.date <= end;
    })();

    return matchesStatus && matchesType && matchesSearch && matchesDate;
  });
});

const clearDateFilter = () => {
  filterDate.value = [];
  dateText.value = "";
};

watch([filterStatus, filterType, filterSearch, filterDate], () => {
  emit("filterChanged", {
    status: filterStatus.value,
    type: filterType.value,
    search: filterSearch.value,
    date: {
      start: filterDate.value[0] || null,
      end: filterDate.value[1] || null,
    },
  });
});

const onInvoiceClick = (invoice: any) => {
  router.push(`/pos/orders/${invoice.id}`);
};

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
</script>