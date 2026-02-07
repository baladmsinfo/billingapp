<template>
  <Web-settings v-if="!device.isMobile" :items="items" />
  <Mobile-settings v-else :items="items" />
</template>

<script setup>
const items = ref([
  { text: "Printer", icon: "mdi-printer", to: "/pos/settings/printer" },
  { text: "Tax Rate", icon: "mdi-cash", to: "/pos/settings/taxrate"}
]);

const device = useDevice();
definePageMeta({
  title: "SETTINGS",
  showBack: true,
});
</script>