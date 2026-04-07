<template>
  <div>
    <!-- Web Orders: Desktop / Large Screens -->
   <Web-Orders
  v-if="!device.isMobile"
  :invoices="invoices"
  :loading="loading"
  :page="page"
  :itemsPerPage="itemsPerPage"
  :sortBy="sortBy"
  :sortDesc="sortDesc"
  @update="handleWebUpdate"
  @rowClick="onRowClick"
  @filterChanged="applyFilters"
  @refreshInvoices="loadInvoices"
/>

    <!-- Mobile Orders -->
    <Mobile-Orders
      v-else
      :invoices="invoices"
      :loading="loading"
      :hasMore="hasMore"
      @loadMore="loadMoreInvoices"
      @filterChanged="applyFilters"
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

/* ------------------------------
   GLOBAL STATE
------------------------------ */
const invoices = ref<any[]>([]);
const loading = ref(false);
const hasMore = ref(true);

const page = ref(1);               // 1-based UI page
const itemsPerPage = ref(15);
const sortBy = ref("date");
const sortDesc = ref(true);


/* ------------------------------
   FILTERS (Shared with Mobile)
------------------------------ */
const filterStatus = ref<string | null>(null);
const filterType = ref<string | null>(null);
const filterSearch = ref<string>("");
const filterDate = ref<{ start?: string; end?: string }>({});

/* ------------------------------
   MAIN FETCH (SERVER FILTERING)
------------------------------ */
const fetchInvoices = async (opts?: any) => {
  loading.value = true;

  try {
    const rows = await getCompanyInvoicesServer({
      company_id: String(DEFAULT_COMPANY_ID),
      page: (opts?.page ?? page.value) - 1, // convert to 0-based
      limit: opts?.itemsPerPage ?? itemsPerPage.value,
      sortBy: "date",
      sortOrder: "desc",

      // Filters
      status: filterStatus.value || null,
      type: filterType.value || null,
      search: filterSearch.value.trim() || null,

      dateStart: filterDate.value.start ? new Date(filterDate.value.start).getTime() : null,
      dateEnd: filterDate.value.end ? new Date(filterDate.value.end).getTime() : null,
    });

    invoices.value = rows;
    hasMore.value = rows.length === itemsPerPage.value;
  } catch (err) {
    console.error("fetchInvoices error:", err);
    invoices.value = [];
    hasMore.value = false;
  } finally {
    loading.value = false;
  }
};

/* ------------------------------
   MOBILE LOAD MORE
------------------------------ */
const loadMoreInvoices = async () => {
  if (loading.value || !hasMore.value) return;
  loading.value = true;

  try {
    const rows = await getCompanyInvoicesServer({
      company_id: DEFAULT_COMPANY_ID,
      page: page.value,
      limit: itemsPerPage.value,
      sortBy: "date",
      sortOrder: "desc",

      status: filterStatus.value || null,
      type: filterType.value || null,
      search: filterSearch.value.trim() || null,

      dateStart: filterDate.value.start ? new Date(filterDate.value.start).getTime() : null,
      dateEnd: filterDate.value.end ? new Date(filterDate.value.end).getTime() : null,
    });

    invoices.value.push(...rows);

    if (rows.length < itemsPerPage.value) hasMore.value = false;
    page.value++;
  } finally {
    loading.value = false;
  }
};

/* ------------------------------
   DESKTOP TABLE UPDATE
------------------------------ */
const handleWebUpdate = (opts: any) => {
  page.value = opts.page;
  itemsPerPage.value = opts.itemsPerPage;
  sortBy.value = opts.sortBy;
  sortDesc.value = opts.sortDesc;

  fetchInvoices(opts);
};

/* ------------------------------
   APPLY FILTERS (Both UIs)
------------------------------ */
const applyFilters = (filters: any) => {
  filterStatus.value = filters.status ?? null;
  filterType.value = filters.type ?? null;
  filterSearch.value = filters.search ?? "";
  filterDate.value = filters.date ?? {};

  // reset pagination
  page.value = 1;
  hasMore.value = true;

  fetchInvoices();
};


const loadInvoices = async () => {
  page.value = 1;       // reset page
  hasMore.value = true;

  await fetchInvoices(); // ✅ reuse your existing API logic
};
onMounted(() => {
  loadInvoices();
});

/* ------------------------------
   ROW CLICK → DETAILS PAGE
------------------------------ */

</script>