<template>
  <Web-settings v-if="!device.isMobile" :items="items" />
  <Mobile-settings v-else :items="items" />
</template>
<script setup>
const items = ref([
  { text: "Printer", icon: "mdi-printer", to: "/pos/settings/printer" },
]);

const device = useDevice();
definePageMeta({
  title: "SETTINGS",
  showBack: true,
});
</script>