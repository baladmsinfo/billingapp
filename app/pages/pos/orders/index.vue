<template>
  <div>
    <!-- Web Orders: Desktop / Large Screens -->
    <Web-Orders
      v-if="!device.isMobile"
      :items="invoices"
      :loading="loading"
      :page="page"
      :itemsPerPage="itemsPerPage"
      :sortBy="sortBy"
      :sortDesc="sortDesc"
      @update="fetchInvoices"
      @rowClick="onRowClick"
    />

    <!-- Mobile Orders: Infinite scroll / load more -->
    <Mobile-Orders
      v-else
      :invoices="invoices"
      :loading="loading"
      :hasMore="hasMore"
      @loadMore="loadMoreInvoices"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useDevice } from "#imports";
import { DEFAULT_COMPANY_ID } from "@/constants/company";
import { useInvoice } from "@/composables/pos/useInvoices";

definePageMeta({
  title: "ORDERS",
  showBack: true,
});

const device = useDevice();
const router = useRouter();

const { getCompanyInvoicesServer } = useInvoice();

// -------- State --------
const invoices = ref<any[]>([]);
const loading = ref(false);
const hasMore = ref(true);

const page = ref(1);               // current page (1-based)
const itemsPerPage = ref(5);      // rows per page
const sortBy = ref("date");        // default sort field
const sortDesc = ref(true);        // default sort order

// -------- Functions --------

// Fetch invoices for web table (server-side sorting + pagination)
const fetchInvoices = async (opts?: { page?: number, itemsPerPage?: number, sortBy?: string, sortDesc?: boolean }) => {
  loading.value = true;

  try {
    const rows = await getCompanyInvoicesServer({
      company_id: String(DEFAULT_COMPANY_ID),
      page: Number(opts?.page ?? page.value) - 1,         // 0-based
      limit: Number(opts?.itemsPerPage ?? itemsPerPage.value),
      sortBy: String(opts?.sortBy ?? sortBy.value),
      sortOrder: (opts?.sortDesc ?? sortDesc.value) ? "desc" : "asc",
    });

    invoices.value = Array.isArray(rows) ? rows : [];
    hasMore.value = rows.length === itemsPerPage.value;
  } catch (err) {
    console.error("Failed to fetch invoices:", err);
    invoices.value = [];
    hasMore.value = false;
  } finally {
    loading.value = false;
  }
};

// Load next page (mobile)
const loadMoreInvoices = async () => {
  if (loading.value || !hasMore.value) return;
  loading.value = true;

  try {
    const rows = await getCompanyInvoicesServer({
      company_id: String(DEFAULT_COMPANY_ID),
      page: page.value,
      limit: itemsPerPage.value,
      sortBy: sortBy.value,
      sortOrder: sortDesc.value ? "desc" : "asc",
    });

    if (Array.isArray(rows)) {
      invoices.value.push(...rows);
      if (rows.length < itemsPerPage.value) hasMore.value = false;
      page.value += 1;
    } else {
      hasMore.value = false;
    }
  } catch (err) {
    console.error("Failed to load more invoices:", err);
    hasMore.value = false;
  } finally {
    loading.value = false;
  }
};

// Row click → navigate to invoice details
const onRowClick = (invoice: any) => {
  if (!invoice?.id) return;
  router.push(`/pos/orders/${invoice.id}`);
};

// Load first page on mount
onMounted(() => {
  fetchInvoices();
});
</script>
