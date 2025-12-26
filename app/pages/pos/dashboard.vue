<template>
 <MobileDashBoard v-if="device.isMobile" />
 <WebDashBoard v-else />
</template>

<script setup>
const device = useDevice();
</script>

<style scoped>
/* Add your custom styles here */
</style>