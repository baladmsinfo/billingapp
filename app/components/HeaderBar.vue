<script setup>
import { computed } from "vue";

/* ---------- PROPS ---------- */
const props = defineProps({
  modelValue: { type: Boolean, default: true },
  title: { type: String, default: "POS SYSTEM" },
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
      { title: "Dashboard", icon: "mdi-cash-register", value: "pos", url: "/pos/dashboard" },
      { title: "POS", icon: "mdi-cash-register", value: "pos", url: "/pos/system" },
      { title: "Orders", icon: "mdi-receipt", value: "orders", url: "/pos/orders" },
      { title: "Products", icon: "mdi-package-variant-closed", value: "products", url: "/pos/products" },
      // { title: "Cart", icon: "mdi-cart", value: "cart", url: "/cart" },
      { title: "Invoices", icon: "mdi-file-document-outline", value: "invoices", url: "/pos/invoices" },
      { title: "Payments", icon: "mdi-credit-card", value: "payments", url: "/pos/payments" },
      { title: "My Account", icon: "mdi-account", value: "account", url: "/pos/account" },
      // { title: "Users", icon: "mdi-account-group-outline", value: "users", url: "/users" },
    ],
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
  <v-navigation-drawer
    v-model="drawer"
    :rail="railState"
    permanent
  >
    <!-- USER -->
    <v-list>
      <v-list-item>
        <template #prepend>
          <v-avatar size="36">
            <img :src="user.avatar" alt="User" />
          </v-avatar>
        </template>
        <template #title>
          {{ user.name }}
        </template>
        <template #append>
          <v-btn icon @click.stop="railState = !railState">
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
        </template>
      </v-list-item>
    </v-list>

    <v-divider />

    <!-- MENU -->
    <v-list density="compact" nav>
      <v-list-item
        v-for="item in menuItems"
        :key="item.value"
        link
        :to="item.url"
        active-class="v-item--active"
      >
        <template #prepend>
          <v-icon>{{ item.icon }}</v-icon>
        </template>
        <template #title>
          {{ item.title }}
        </template>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>

  <v-app-bar :title="title" />
</template>
