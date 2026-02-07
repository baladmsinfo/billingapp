<template>
  <web-taxrate v-if="!device.isMobile" />
  <mobile-taxrate v-else />
</template>
<script setup>

const device = useDevice();

definePageMeta({
  title: 'Tax Rates',
  showBack: true
})
</script>