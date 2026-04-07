<template>
  <v-container fluid class="pa-4 orders-bg">

    <!-- ===== HEADER ===== -->
    <v-card class="pa-5 mb-4 rounded-xl header-card" elevation="0">
      <div class="d-flex justify-space-between align-center mb-4">
        <div>
          <div class="text-h5 font-weight-bold text-grey-darken-3">Orders</div>
          <div class="text-caption text-grey">Manage all your invoices</div>
        </div>
        <v-btn color="primary" class="rounded-lg px-5" elevation="2" @click="openCreateInvoice">
          <v-icon start size="18">mdi-plus</v-icon>
          Create Invoice
        </v-btn>
      </div>

      <!-- FILTERS -->
      <v-row dense>
        <v-col cols="12" sm="3">
          <v-text-field
            v-model="filterSearch"
            label="Search Invoice #"
            clearable
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-magnify"
            hide-details
            bg-color="white"
          />
        </v-col>
        <v-col cols="6" sm="2">
          <v-select
            v-model="filterStatus"
            :items="statusOptions"
            label="Status"
            clearable
            variant="outlined"
            density="comfortable"
            hide-details
            bg-color="white"
          />
        </v-col>
        <v-col cols="6" sm="2">
          <v-select
            v-model="filterType"
            :items="typeOptions"
            label="Type"
            clearable
            variant="outlined"
            density="comfortable"
            hide-details
            bg-color="white"
          />
        </v-col>
        <v-col cols="12" sm="5">
          <v-menu v-model="dateMenu" :close-on-content-click="false" max-width="400" min-width="290">
            <template #activator="{ props: ap }">
              <v-text-field
                v-bind="ap"
                v-model="dateText"
                label="Filter by Date Range"
                prepend-inner-icon="mdi-calendar-range"
                readonly
                clearable
                variant="outlined"
                density="comfortable"
                hide-details
                bg-color="white"
                @click:clear="clearDateFilter"
              />
            </template>
            <v-card>
              <v-date-picker v-model="filterDate" range scrollable color="primary" />
              <v-card-actions>
                <v-spacer />
                <v-btn text color="primary" @click="dateMenu = false">Cancel</v-btn>
                <v-btn text color="primary" @click="applyDateFilter">Apply</v-btn>
              </v-card-actions>
            </v-card>
          </v-menu>
        </v-col>
      </v-row>
    </v-card>

    <!-- ===== TABLE ===== -->
    <v-card class="rounded-xl" elevation="0" border>
      <v-data-table
        :headers="headers"
        :items="filteredInvoices"
        :loading="loading"
        item-key="id"
        :items-per-page="itemsPerPage"
        class="orders-table"
        :expanded="expanded"
        expand-on-click
        show-expand
      >
        <!-- Invoice # -->
        <template #item.invoice_number="{ item }">
          <span class="font-weight-bold text-primary">{{ item.invoice_number || '—' }}</span>
        </template>

        <!-- Date -->
        <template #item.date="{ item }">
          <span class="text-body-2">{{ formatDate(item.date) }}</span>
        </template>

        <!-- Due Date -->
        <template #item.due_date="{ item }">
          <span class="text-body-2" :class="isOverdue(item) ? 'text-red font-weight-bold' : ''">
            {{ formatDate(item.due_date) }}
          </span>
        </template>

        <!-- Type -->
        <template #item.type="{ item }">
          <v-chip size="x-small" :color="typeColor(item.type)" variant="tonal" class="font-weight-medium">
            {{ item.type }}
          </v-chip>
        </template>

        <!-- Status -->
        <template #item.status="{ item }">
          <v-chip size="small" :color="statusColor(item.status)" variant="flat" class="font-weight-medium">
            <v-icon start size="12">{{ statusIcon(item.status) }}</v-icon>
            {{ item.status }}
          </v-chip>
        </template>

        <!-- Party -->
        <template #item.party="{ item }">
          <div v-if="item.party">
            <div class="font-weight-medium text-body-2">{{ item.party.name }}</div>
            <div class="text-caption text-grey">{{ item.party.phone || item.party.email || '—' }}</div>
          </div>
          <span v-else class="text-grey text-caption">Walk-in</span>
        </template>

        <!-- Total Amount -->
        <template #item.total_amount="{ item }">
          <div class="text-right">
            <div class="font-weight-bold text-body-1">₹{{ formatAmount(item.total_amount) }}</div>
            <div v-if="item.tax_amount > 0" class="text-caption text-grey">Tax: ₹{{ formatAmount(item.tax_amount) }}</div>
          </div>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <v-btn icon size="small" variant="tonal" color="primary" @click.stop="onInvoiceClick(item)">
            <v-icon size="16">mdi-eye</v-icon>
          </v-btn>
        </template>

        <!-- EXPANDED ROW -->
        <template #expanded-row="{ item }">
          <tr>
            <td :colspan="headers.length + 1" class="pa-0">
              <div class="expanded-section pa-4">
                <v-row>

                  <!-- Party Info -->
                  <v-col cols="12" md="3" v-if="item.party">
                    <div class="info-block">
                      <div class="info-label">
                        <v-icon size="14" class="mr-1">mdi-account</v-icon>
                        Party Details
                      </div>
                      <div class="info-value">{{ item.party.name }}</div>
                      <div class="info-sub" v-if="item.party.email">{{ item.party.email }}</div>
                      <div class="info-sub" v-if="item.party.phone">{{ item.party.phone }}</div>
                      <div class="info-sub" v-if="item.party.gstin">GSTIN: {{ item.party.gstin }}</div>
                      <div class="info-sub">Type: {{ item.party.type }}</div>
                    </div>
                  </v-col>

                  <!-- Billing Address -->
                  <v-col cols="12" md="3">
                    <div class="info-block">
                      <div class="info-label">
                        <v-icon size="14" class="mr-1">mdi-map-marker</v-icon>
                        Billing Address
                      </div>
                      <template v-if="item.billing_address">
                        <div class="info-value">{{ item.billing_address.line1 }}</div>
                        <div class="info-sub" v-if="item.billing_address.line2">{{ item.billing_address.line2 }}</div>
                        <div class="info-sub">
                          {{ [item.billing_address.city, item.billing_address.state, item.billing_address.pincode].filter(Boolean).join(', ') }}
                        </div>
                        <div class="info-sub" v-if="item.billing_address.country">{{ item.billing_address.country }}</div>
                      </template>
                      <div class="info-sub text-grey" v-else>Not provided</div>
                    </div>
                  </v-col>

                  <!-- Shipping Address -->
                  <v-col cols="12" md="3">
                    <div class="info-block">
                      <div class="info-label">
                        <v-icon size="14" class="mr-1">mdi-truck-delivery</v-icon>
                        Shipping Address
                      </div>
                      <template v-if="item.shipping_address">
                        <div class="info-value">{{ item.shipping_address.line1 }}</div>
                        <div class="info-sub" v-if="item.shipping_address.line2">{{ item.shipping_address.line2 }}</div>
                        <div class="info-sub">
                          {{ [item.shipping_address.city, item.shipping_address.state, item.shipping_address.pincode].filter(Boolean).join(', ') }}
                        </div>
                        <div class="info-sub" v-if="item.shipping_address.country">{{ item.shipping_address.country }}</div>
                      </template>
                      <div class="info-sub text-grey" v-else>Same as billing / Not provided</div>
                    </div>
                  </v-col>

                  <!-- Summary -->
                  <v-col cols="12" md="3">
                    <div class="info-block">
                      <div class="info-label">
                        <v-icon size="14" class="mr-1">mdi-calculator</v-icon>
                        Amount Summary
                      </div>
                      <div class="d-flex justify-space-between text-caption mt-1">
                        <span class="text-grey">Subtotal</span>
                        <span>₹{{ formatAmount(item.total_amount - (item.tax_amount || 0)) }}</span>
                      </div>
                      <div class="d-flex justify-space-between text-caption mt-1">
                        <span class="text-grey">Tax</span>
                        <span>₹{{ formatAmount(item.tax_amount || 0) }}</span>
                      </div>
                      <v-divider class="my-1" />
                      <div class="d-flex justify-space-between text-body-2 font-weight-bold">
                        <span>Total</span>
                        <span class="text-primary">₹{{ formatAmount(item.total_amount) }}</span>
                      </div>
                    </div>
                  </v-col>
                </v-row>

                <!-- Items Table -->
                <div class="mt-4" v-if="item.items && item.items.length">
                  <div class="info-label mb-2">
                    <v-icon size="14" class="mr-1">mdi-package-variant</v-icon>
                    Invoice Items ({{ item.items.length }})
                  </div>
                  <v-table density="compact" class="items-table rounded-lg">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Variant / SKU</th>
                        <th class="text-right">Qty</th>
                        <th class="text-right">Price</th>
                        <th class="text-right">Tax</th>
                        <th class="text-right">Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="lineItem in item.items" :key="lineItem.id">
                        <td>
                          <div class="font-weight-medium">{{ lineItem.product?.name || '—' }}</div>
                          <div class="text-caption text-grey">{{ lineItem.product?.sku }}</div>
                        </td>
                        <td>
                          <div class="text-body-2">{{ lineItem.item?.variant || '—' }}</div>
                          <div class="text-caption text-grey">{{ lineItem.item?.sku }}</div>
                        </td>
                        <td class="text-right">{{ lineItem.quantity }}</td>
                        <td class="text-right">₹{{ formatAmount(lineItem.price) }}</td>
                        <td class="text-right">
                          <span v-if="lineItem.tax_rate">{{ lineItem.tax_rate.percentage }}%</span>
                          <span v-else class="text-grey">—</span>
                        </td>
                        <td class="text-right font-weight-bold">₹{{ formatAmount(lineItem.total) }}</td>
                        <td>
                          <v-chip size="x-small" :color="itemStatusColor(lineItem.status)" variant="tonal">
                            {{ lineItem.status }}
                          </v-chip>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </div>
            </td>
          </tr>
        </template>

      </v-data-table>
    </v-card>

    <!-- ===== CREATE INVOICE DIALOG ===== -->
    <v-dialog v-model="createDialog" max-width="900" scrollable>
      <v-card class="pa-6 rounded-xl" elevation="8" style="max-height:95vh; overflow:auto;">
        <div class="text-h6 mb-3 font-weight-bold">Create Invoice</div>
        <v-divider class="mb-4" />

        <v-row dense>
          <v-col cols="12" sm="4">
            <v-select label="Invoice Type" :items="invoiceTypes" v-model="form.type" density="comfortable"
              variant="outlined" @update:model-value="loadPartyList" />
          </v-col>
          <v-col cols="12" sm="8">
            <v-autocomplete label="Select Party / Vendor" :items="parties" item-title="name" item-value="id"
              v-model="form.party_id" density="comfortable" variant="outlined" clearable />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field type="date" label="Invoice Date" v-model="form.date" density="comfortable" variant="outlined" />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field type="date" label="Due Date" v-model="form.due_date" density="comfortable" variant="outlined" />
          </v-col>
        </v-row>

        <v-textarea label="Notes (optional)" v-model="form.notes" variant="outlined" rows="2" density="comfortable" class="mt-2" />
        <v-divider class="my-4" />

        <div class="text-subtitle-2 font-weight-medium mb-2">Invoice Items</div>

        <v-card v-for="(row, index) in form.items" :key="index" class="pa-4 mb-3 rounded-lg bg-grey-lighten-4">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-autocomplete label="Select Product" :items="products" item-title="product_name" item-value="product_id"
                v-model="row.product_id" density="comfortable" variant="outlined"
                @update:model-value="(id) => loadItemOptionsForRow(id, index)" />
            </v-col>
            <v-col cols="12" sm="6" v-if="row.itemOptions?.length">
              <v-autocomplete label="Select Variant" :items="row.itemOptions" item-title="fullName" item-value="item_id"
                v-model="row.item_id" density="comfortable" variant="outlined"
                @update:model-value="(id) => assignSelectedItem(id, index)" />
            </v-col>
            <v-col cols="4">
              <v-text-field label="Qty" type="number" v-model.number="row.quantity" density="comfortable" variant="outlined" @input="calcTotal" />
            </v-col>
            <v-col cols="4">
              <v-text-field label="Price" type="number" v-model.number="row.price" density="comfortable" variant="outlined" @input="calcTotal" />
            </v-col>
            <v-col cols="4">
              <v-select label="Tax Rate" :items="taxRates" item-title="name" item-value="id" v-model="row.tax_rate_id"
                density="comfortable" variant="outlined" @update:model-value="(id) => assignTaxRate(id, index)" />
            </v-col>
          </v-row>
          <div class="text-right text-caption text-red mt-1" style="cursor:pointer" @click="removeItem(index)">Remove</div>
        </v-card>

        <v-btn color="primary" variant="outlined" block class="mb-4" @click="addNewItemRow">+ Add Item</v-btn>

        <v-card class="pa-4 rounded-xl" elevation="0" color="grey-lighten-4">
          <div class="d-flex justify-space-between mb-1 text-body-2">
            <span class="text-grey">Subtotal</span><span>₹{{ subTotal.toFixed(2) }}</span>
          </div>
          <div class="d-flex justify-space-between mb-1 text-body-2">
            <span class="text-grey">Tax</span><span>₹{{ taxAmount }}</span>
          </div>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between align-center">
            <span class="text-h6 font-weight-bold">Grand Total</span>
            <span class="text-h5 font-weight-bold text-primary">₹{{ form.total_amount.toFixed(2) }}</span>
          </div>
        </v-card>

        <v-btn block color="primary" class="mt-4 py-3 rounded-lg" @click="submitInvoice">Create Invoice</v-btn>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { DEFAULT_COMPANY_ID } from "@/constants/company";
import { useInvoice } from "@/composables/pos/useInvoices";

const company_id = DEFAULT_COMPANY_ID;
const router = useRouter();

const props = defineProps<{
  invoices: any[];
  loading: boolean;
  hasMore: boolean;
  page?: number;
  itemsPerPage?: number;
}>();

const emit = defineEmits(["loadMore", "filterChanged", "refreshInvoices", "rowClick", "update"]);

// ── Table ──────────────────────────────────────────────────────────
const expanded = ref<string[]>([]);
const itemsPerPage = ref(props.itemsPerPage ?? 15);

const headers = [
  { title: 'Invoice #',   key: 'invoice_number', sortable: true,  width: '140px' },
  { title: 'Date',        key: 'date',           sortable: true,  width: '110px' },
  { title: 'Due Date',    key: 'due_date',       sortable: false, width: '110px' },
  { title: 'Type',        key: 'type',           sortable: true,  width: '100px' },
  { title: 'Status',      key: 'status',         sortable: true,  width: '120px' },
  { title: 'Party',       key: 'party',          sortable: false },
  { title: 'Amount',      key: 'total_amount',   sortable: true,  align: 'end', width: '130px' },
  { title: '',            key: 'actions',        sortable: false, width: '60px'  },
];

// ── Filters ────────────────────────────────────────────────────────
const filterStatus = ref<string | null>(null);
const filterType   = ref<string | null>(null);
const filterSearch = ref("");
const filterDate   = ref<string[]>([]);
const dateMenu     = ref(false);
const dateText     = ref("");

const statusOptions = ["PENDING", "PAID", "PARTIAL", "PAYLATER", "CANCELLED"];
const typeOptions   = ["SALE", "POS", "PURCHASE", "RETURN", "EXPENSE", "OTHER"];

const filteredInvoices = computed(() => {
  return props.invoices.filter(inv => {
    const matchStatus = filterStatus.value ? inv.status === filterStatus.value : true;
    const matchType   = filterType.value   ? inv.type   === filterType.value   : true;
    const matchSearch = filterSearch.value
      ? inv.invoice_number?.toLowerCase().includes(filterSearch.value.toLowerCase())
        || inv.party?.name?.toLowerCase().includes(filterSearch.value.toLowerCase())
      : true;
    const matchDate = (() => {
      if (filterDate.value.length !== 2) return true;
      const start = new Date(filterDate.value[0]).getTime();
      const end   = new Date(filterDate.value[1]).getTime();
      return inv.date >= start && inv.date <= end;
    })();
    return matchStatus && matchType && matchSearch && matchDate;
  });
});

watch([filterStatus, filterType, filterSearch, filterDate], () => {
  emit("filterChanged", {
    status: filterStatus.value,
    type:   filterType.value,
    search: filterSearch.value,
    date: { start: filterDate.value[0] || null, end: filterDate.value[1] || null },
  });
});

const applyDateFilter = () => {
  if (filterDate.value.length === 2) {
    const [s, e] = filterDate.value;
    dateText.value = `${new Date(s).toLocaleDateString()} - ${new Date(e).toLocaleDateString()}`;
  }
  dateMenu.value = false;
};
const clearDateFilter = () => { filterDate.value = []; dateText.value = ""; };

// ── Helpers ────────────────────────────────────────────────────────
const formatDate = (ts: number | null) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatAmount = (v: number) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isOverdue = (inv: any) => inv.due_date && inv.due_date < Date.now() && inv.status !== 'PAID';

const statusColor = (s: string) => ({ PAID: 'green', PARTIAL: 'orange', PAYLATER: 'blue', CANCELLED: 'red', PENDING: 'grey' }[s] || 'grey');
const statusIcon  = (s: string) => ({ PAID: 'mdi-check-circle', PARTIAL: 'mdi-circle-half-full', PAYLATER: 'mdi-clock-outline', CANCELLED: 'mdi-close-circle', PENDING: 'mdi-receipt' }[s] || 'mdi-receipt');
const typeColor   = (t: string) => ({ SALE: 'teal', POS: 'indigo', PURCHASE: 'deep-purple', RETURN: 'pink', EXPENSE: 'brown', OTHER: 'grey' }[t] || 'grey');
const itemStatusColor = (s: string) => ({ ORDERED: 'blue', DELIVERED: 'green', CANCELLED: 'red', SHIPPED: 'teal' }[s] || 'grey');

const onInvoiceClick = (invoice: any) => router.push(`/pos/orders/${invoice.id}`);

// ── Create Invoice ─────────────────────────────────────────────────
const createDialog = ref(false);
const { createInvoice, getAllTaxRates, getPartiesByType, getAllProducts } = useInvoice();
const invoiceTypes = ["SALE", "POS", "PURCHASE", "RETURN", "EXPENSE", "OTHER"];
const parties  = ref<any[]>([]);
const products = ref<any[]>([]);
const taxRates = ref<any[]>([]);

const form = ref({ type: "SALE", party_id: "", date: new Date().toISOString().slice(0,10), due_date: "", notes: "", items: [] as any[], total_amount: 0 });

const subTotal = computed(() => form.value.items.reduce((s, r) => s + (Number(r.quantity)||0) * (Number(r.price)||0), 0));
const taxAmount = computed(() => {
  let tax = 0;
  for (const r of form.value.items) {
    const sub = (Number(r.quantity)||0) * (Number(r.price)||0);
    tax += (sub * Number(r.tax_percent||0)) / 100;
  }
  return tax.toFixed(2);
});

const calcTotal = () => {
  form.value.total_amount = form.value.items.reduce((tot, r) => {
    const sub = (Number(r.quantity)||0) * (Number(r.price)||0);
    return tot + sub + (sub * Number(r.tax_percent||0)) / 100;
  }, 0);
};

const addNewItemRow  = () => form.value.items.push({ product_id: "", item_id: "", quantity: 1, price: 0, tax_rate_id: "", tax_percent: 0, itemOptions: [] });
const removeItem     = (i: number) => { form.value.items.splice(i, 1); calcTotal(); };

const loadItemOptionsForRow = (product_id: string, index: number) => {
  const row     = form.value.items[index];
  const product = products.value.find(p => p.product_id === product_id);
  row.itemOptions = product ? product.items.map((i: any) => ({ item_id: i.item_id, fullName: `${i.variant || i.sku || 'Variant'} — ₹${i.price}`, price: i.price })) : [];
  row.item_id = ""; row.price = 0; calcTotal();
};

const assignSelectedItem = (item_id: string, index: number) => {
  const row    = form.value.items[index];
  const option = row.itemOptions.find((i: any) => i.item_id === item_id);
  if (option) row.price = option.price;
  calcTotal();
};

const assignTaxRate = (id: string, index: number) => {
  const row = form.value.items[index];
  const tax = taxRates.value.find((t: any) => t.id === id);
  if (tax) { row.tax_rate_id = tax.id; row.tax_percent = tax.percent; }
  calcTotal();
};

const loadPartyList = async () => {
  const type = form.value.type === "PURCHASE" ? "VENDOR" : "CUSTOMER";
  parties.value = await getPartiesByType(company_id, type);
};

const openCreateInvoice = async () => {
  await Promise.all([loadPartyList(), (async () => { products.value = await getAllProducts(company_id); })(), (async () => { taxRates.value = await getAllTaxRates(company_id); })()]);
  form.value.items = [];
  addNewItemRow();
  createDialog.value = true;
};

const submitInvoice = async () => {
  if (!form.value.party_id) return alert("Select a customer/vendor");
  if (!form.value.items.length) return alert("Add at least one item");
  for (const [i, r] of form.value.items.entries()) {
    if (!r.product_id || !r.item_id) return alert(`Row ${i+1} incomplete`);
  }
  try {
    await createInvoice({
      company_id,
      type: form.value.type,
      party_id: form.value.party_id,
      date: new Date(form.value.date).getTime(),
      items: form.value.items.map(r => ({ product_id: r.product_id, item_id: r.item_id, quantity: r.quantity, price: r.price, tax_rate_id: r.tax_rate_id, tax_percent: r.tax_percent })),
      total_amount: Number(form.value.total_amount),
      tax_amount: parseFloat(taxAmount.value),
      due_date: form.value.due_date ? new Date(form.value.due_date).getTime() : null,
      notes: form.value.notes,
    });
    emit("refreshInvoices");
    createDialog.value = false;
  } catch (err) {
    console.error(err);
    alert("Failed to create invoice");
  }
};
</script>

<style scoped>
.orders-bg { background: #f4f6f9; min-height: 100vh; }

.header-card {
  background: white;
  border: 1px solid #e8ecf0;
}

.orders-table :deep(th) {
  background: #f8fafc !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b !important;
}

.orders-table :deep(tr:hover td) {
  background: #f8fafc;
}

.expanded-section {
  background: #f8fafc;
  border-top: 2px solid #e2e8f0;
}

.info-block {
  padding: 12px 16px;
  background: white;
  border-radius: 10px;
  border: 1px solid #e8ecf0;
  height: 100%;
}

.info-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #64748b;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}

.info-sub {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.items-table {
  background: white;
  border: 1px solid #e2e8f0;
}

.items-table :deep(th) {
  background: #f1f5f9 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  color: #64748b !important;
}
</style>