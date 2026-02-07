<script setup>
import { useRoute, useRouter } from "vue-router";
import { computed } from "vue";

/* ---------- PROPS ---------- */
const props = defineProps({
  menuItems: {
    type: Array,
    default: () => [
      { title: "Dashboard", icon: "mdi-view-dashboard", url: "/pos/dashboard" },
      { title: "POS", icon: "mdi-cash-register", url: "/pos/system" },
      { title: "Orders", icon: "mdi-receipt", url: "/pos/orders" },
      { title: "Products", icon: "mdi-package-variant-closed", url: "/pos/products" },
    ]
  }
});

const route = useRoute();
const router = useRouter();

/* Highlight current tab */
const active = computed(() => route.path);
</script>

<template>
  <v-bottom-navigation height="64" grow active>
    <v-btn
      v-for="item in menuItems"
      :key="item.url"
      :value="item.url"
      :active="active === item.url"
      @click="router.push(item.url)"
    >
      <v-icon>{{ item.icon }}</v-icon>
      <span>{{ item.title }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<style scoped>
/* Better mobile look */
.v-bottom-navigation {
  border-top: 1px solid #ddd;
}
.v-btn {
  flex-direction: column;
}
</style>