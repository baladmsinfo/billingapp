<template>
  <web-customers v-if="!device.isMobile" />
  <mobile-customers v-else />
</template>
<script setup>

const device = useDevice();
definePageMeta({
  title: 'Parties',
  showBack: true
})
</script>