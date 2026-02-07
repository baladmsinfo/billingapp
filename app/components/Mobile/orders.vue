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
          <v-text-field v-model="filterSearch" label="Search Invoice #" dense clearable outlined
            prepend-inner-icon="mdi-magnify" />
        </v-col>

        <!-- Status -->
        <v-col cols="6" sm="2">
          <v-select v-model="filterStatus" :items="statusOptions" label="Status" dense clearable outlined />
        </v-col>

        <!-- Type -->
        <v-col cols="6" sm="2">
          <v-select v-model="filterType" :items="typeOptions" label="Type" dense clearable outlined />
        </v-col>

        <!-- Date Range -->
        <v-col cols="12" sm="5">
          <v-menu v-model="dateMenu" :close-on-content-click="false" transition="scale-transition" max-width="400"
            min-width="290" offset-y>
            <template #activator="{ props: menuProps }">
              <v-text-field v-bind="menuProps" v-model="dateText" label="Filter by Date Range"
                prepend-inner-icon="mdi-calendar-range" readonly clearable dense outlined
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
    </v-slide-y-transition>

    <!-- INVOICE LIST -->
    <v-row>
      <v-col v-for="invoice in filteredInvoices" :key="invoice.id" cols="12">
        <v-card rounded="2xl" elevation="2" class="invoice-card" ripple role="button" tabindex="0"
          @click="onInvoiceClick(invoice)">
          <!-- HEADER -->
          <div class="header">
            <div>
              <div class="number">
                #{{ invoice.invoice_number || "—" }}
              </div>
              <div class="meta">
                {{ new Date(invoice.date).toLocaleDateString() }} • {{ invoice.type }}
              </div>
            </div>

            <v-chip size="small" :color="statusColor(invoice.status)" variant="flat">
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
              <div class="amount">₹{{ Number(invoice.total_amount).toFixed(2) }}</div>
            </div>
            <v-icon>mdi-chevron-right</v-icon>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- LOADING -->
    <v-row v-if="loading">
      <v-col cols="12"><v-skeleton-loader type="article" /></v-col>
    </v-row>

    <!-- LOAD MORE -->
    <v-row v-if="hasMore && !loading">
      <v-col cols="12">
        <v-btn block variant="text" @click="$emit('loadMore')">Click here to Load more</v-btn>
      </v-col>
    </v-row>

    <!-- EMPTY -->
    <v-row v-if="!loading && filteredInvoices.length === 0">
      <v-col cols="12" class="text-center py-12">
        <v-icon size="56" color="grey">mdi-receipt-text-outline</v-icon>
        <div class="text-grey mt-2">No invoices found</div>
      </v-col>
    </v-row>

    <!-- FAB BUTTON -->
    <v-btn class="fab-rich" icon color="primary" size="large" @click="openCreateInvoice">
      <v-icon>mdi-plus</v-icon>
    </v-btn>

    <!-- CREATE INVOICE DIALOG -->
    <v-dialog v-model="createDialog" max-width="520" scrollable>
      <v-card class="pa-4 rounded-xl dialog-scroll" elevation="8">

        <div class="text-h6 mb-3 font-weight-bold">Create Invoice</div>
        <v-divider class="mb-3"></v-divider>

        <!-- ===================== INVOICE DETAILS ===================== -->
        <v-select label="Invoice Type" :items="invoiceTypes" v-model="form.type" density="comfortable"
          variant="outlined" @change="loadPartyList" />

        <v-autocomplete label="Select Customer / Vendor" :items="parties" item-title="name" item-value="id"
          v-model="form.party_id" density="comfortable" variant="outlined" class="mt-3" clearable />

        <v-text-field type="date" label="Invoice Date" v-model="form.date" density="comfortable" variant="outlined" />

        <v-text-field type="date" label="Due Date" v-model="form.due_date" density="comfortable" variant="outlined" />

        <v-textarea label="Notes (optional)" v-model="form.notes" variant="outlined" rows="2" density="comfortable"
          class="mt-2" />

        <v-divider class="my-4"></v-divider>

        <!-- ===================== DYNAMIC INVOICE ITEMS ===================== -->
        <div class="text-subtitle-2 font-weight-medium mb-2">Invoice Items</div>

        <div v-for="(row, index) in form.items" :key="index" class="mb-4 rounded-lg bg-grey-lighten-4 pa-4">

          <!-- PRODUCT -->
          <v-autocomplete label="Select Product" :items="products" item-title="product_name" item-value="product_id"
            v-model="row.product_id" density="comfortable" variant="outlined" clearable
            @update:model-value="(id) => loadItemOptionsForRow(id, index)" />

          <!-- ITEM VARIANT -->
          <v-autocomplete v-if="row.itemOptions && row.itemOptions.length" label="Select Item / Variant"
            :items="row.itemOptions" item-title="fullName" item-value="item_id" v-model="row.item_id"
            density="comfortable" variant="outlined" class="mt-3" clearable
            @update:model-value="(id) => assignSelectedItem(id, index)" />

          <!-- QTY + PRICE -->
          <v-row dense class="mt-2">
            <v-col cols="6">
              <v-text-field label="Qty" type="number" v-model.number="row.quantity" density="comfortable"
                variant="outlined" @input="calcTotal" />
            </v-col>

            <v-col cols="6">
              <v-text-field label="Price" type="number" v-model.number="row.price" density="comfortable"
                variant="outlined" @input="calcTotal" />
            </v-col>
          </v-row>

          <!-- TAX RATE PER ITEM -->
          <v-select label="Tax Rate" :items="taxRates" item-title="name" item-value="id" v-model="row.tax_rate_id"
            class="mt-3" density="comfortable" variant="outlined"
            @update:model-value="(id) => assignTaxRate(id, index)"></v-select>


          <!-- REMOVE ITEM ROW -->
          <div class="text-right mt-1 text-caption text-red" style="cursor:pointer" @click="removeItem(index)">
            Remove
          </div>
        </div>

        <!-- ADD ANOTHER ITEM -->
        <v-btn color="primary" variant="outlined" class="mb-4" block @click="addNewItemRow">
          + Add Another Item
        </v-btn>

        <!-- BOTTOM TOTAL + BUTTON (FIXED) -->
        <div style="
    position: sticky;
    bottom: 0;
    z-index: 10;
    background: #ffffff;
    padding: 16px;
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.12);
  ">
          <!-- TOTAL SUMMARY -->
          <div class="mb-3">
            <div class="d-flex justify-space-between mb-1">
              <span class="text-body-2 text-grey-darken-1">Sub Total</span>
              <span class="text-body-2 font-weight-bold">
                ₹{{ subTotal.toFixed(2) }}
              </span>
            </div>

            <div class="d-flex justify-space-between mb-1">
              <span class="text-body-2 text-grey-darken-1">
                Total Tax
              </span>
              <span class="text-body-2 font-weight-bold">
                ₹{{ Number(taxAmount).toFixed(2) }}
              </span>
            </div>

            <v-divider class="my-2"></v-divider>

            <div class="d-flex justify-space-between align-center">
              <span class="text-h6 font-weight-bold">Grand Total</span>

              <span class="text-h5 font-weight-bold" style="
          color: #1976d2;
          border-radius: 5px;
        ">
                ₹{{ form.total_amount.toFixed(2) }}
              </span>
            </div>
          </div>

          <!-- SUBMIT BUTTON -->
          <v-btn block color="primary" class="py-3 rounded-lg" @click="submitInvoice">
            Create Invoice
          </v-btn>
        </div>

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

<style scoped>
.list-bg {
  background: #f7f8fa;
  min-height: 100vh;
}

.invoice-card {
  padding: 10px;
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

.fab-rich {
  position: fixed;
  bottom: 72px;
  right: 16px;
  border-radius: 50%;
  box-shadow: 0 12px 30px rgba(79, 70, 229, 0.4);
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