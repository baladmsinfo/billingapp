<script setup>
import { computed } from "vue";

/* ---------- PROPS ---------- */
const props = defineProps({
  modelValue: { type: Boolean, default: true },
  rail: { type: Boolean, default: false },
  user: {
    type: Object,
    default: () => ({
      name: "John Leider",
      avatar: "https://randomuser.me/api/portraits/men/85.jpg",
    }),
  },
  menuItems: {
    type: Array,
    default: () => [
      { title: "Dashboard", icon: "mdi-view-dashboard-outline", value: "dashboard", url: "/pos/dashboard" },
      { title: "POS", icon: "mdi-cash-register", value: "pos-system", url: "/pos/system" },
      { title: "Invoices", icon: "mdi-receipt", value: "orders", url: "/pos/orders" },
      { title: "Products", icon: "mdi-package-variant", value: "products", url: "/pos/products" },
      { title: "Parties", icon: "mdi-account-group-outline", value: "customers", url: "/pos/customers" },
      { title: "Payments", icon: "mdi-credit-card-outline", value: "payments", url: "/pos/payments" },
      { title: "Settings", icon: "mdi-cog-outline", value: "settings", url: "/pos/settings" },
    ]
  },
});

/* ---------- EMITS ---------- */
const emit = defineEmits(["update:modelValue", "update:rail"]);

/* ---------- COMPUTED (v-model support) ---------- */
const drawer = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const railState = computed({
  get: () => props.rail,
  set: (val) => emit("update:rail", val),
});
</script>

<template>
  <!-- MODERN SIDEBAR -->
  <v-navigation-drawer v-model="drawer" :rail="railState" permanent rounded="lg" elevation="3"
    class="bg-white shadow-sm" width="220" rail-width="72">

    <div class="sidebar-header">
      <div v-if="!railState" class="sidebar-title">
        <v-avatar size="40">
          <img :src="user.avatar" alt="User" />
        </v-avatar>
      </div>

      <v-btn icon class="chevron-btn" elevation="0" @click.stop="railState = !railState">
        <v-icon size="20">
          {{ railState ? 'mdi-chevron-right' : 'mdi-chevron-left' }}
        </v-icon>
      </v-btn>
    </div>

    <v-divider />

    <!-- MENU ITEMS -->
    <v-list dense nav>
      <v-list-item v-for="item in menuItems" :key="item.value" link :to="item.url"
        class="rounded-lg mx-2 my-1 hover:bg-gray-100 active:bg-gray-200 transition-colors"
        active-class="bg-gray-200 font-semibold">
        <template #prepend>
          <v-icon size="24" class="text-gray-600">{{ item.icon }}</v-icon>
        </template>
        <template #title>
          <span v-if="!railState" class="ml-2 text-gray-800">{{ item.title }}</span>
        </template>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<style scoped>
/* Hover and smooth transition */
.v-list-item {
  transition: background-color 0.2s ease, color 0.2s ease;
}

.v-list-item:hover {
  cursor: pointer;
}

/* Small tweaks to exactly match your design */
.v-navigation-drawer {
  border-right: 1px solid #e5e7eb;
  /* subtle border like screenshot */
}

.v-avatar img {
  object-fit: cover;
}

.v-btn {
  transition: all 0.2s ease;
}

/* Sidebar border like image */
.v-navigation-drawer {
  border-right: 1px solid #e5e7eb;
}

/* HEADER */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 14px 12px 16px;
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 4px;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.subtitle {
  font-size: 12px;
  color: #6b7280;
}

/* Chevron button */
.chevron-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 50%;
  border-color: #e5e7eb;
}

/* Menu items */
.v-list-item {
  transition: background-color 0.2s ease;
}

.v-list-item:hover {
  background-color: #f3f4f6;
}

.v-list-item--active {
  background-color: #eef2ff !important;
  font-weight: 600;
}
</style>