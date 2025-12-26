<template>
  <v-app>
    <MobileHeader />
    <v-main>
      <v-container>
        <slot />
      </v-container>
    </v-main>
    <MobileBottomNav />
  </v-app>
</template>

<script setup></script>
