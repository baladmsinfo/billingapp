<template>
  <v-container>
    <MobileDashBoard v-if="device.isMobile" />
    <WebDashBoard v-else />
  </v-container>
</template>

<script setup>
const device = useDevice();
definePageMeta({
  title: "POS",
  showBack: false,
});


</script>

<style scoped>
/* Add your custom styles here */
</style>