<template> 
  <Web-pos v-if="!device.isMobile" /> 
  <Mobile-pos v-else />
</template>

<script setup>

const device = useDevice();
definePageMeta({
  title: 'POS',
  showBack: true
})
</script>