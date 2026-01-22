<template>
  <web-products v-if="!device.isMobile" />
  <mobile-products v-else />
</template>
<script setup>

const device = useDevice();
definePageMeta({
  title: 'Products',
  showBack: true
})
</script>