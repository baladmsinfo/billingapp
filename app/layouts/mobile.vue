<template>
  <v-app>
      <v-app-bar density="comfortable" flat>
      <v-btn v-if="showBack" icon @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-app-bar-title class="font-weight-black">{{ title }}</v-app-bar-title>
    </v-app-bar>
    <v-main>
        <slot />
    </v-main>
    <!--<MobileBottomNav v-if="showBottomNav" />-->
  </v-app>
</template>

<script setup>

import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const title = computed(() => route.meta.title || '')
const showBack = computed(() => route.meta.showBack)

// ✅ Show bottom nav ONLY on dashboard
const showBottomNav = computed(() => {
  return route.path === '/pos/dashboard'
})

</script>
