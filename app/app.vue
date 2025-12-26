<template>
  <NuxtLayout :name="layout">
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
const layout = useState("layout", () => "login");
const device = useDevice();

console.log(device.isMobile);
console.log(device.isDesktop);
console.log(device.isTablet);
console.log(device.isIos);
console.log(device.isAndroid);
</script>