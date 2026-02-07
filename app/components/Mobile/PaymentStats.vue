<script setup>
const props = defineProps({ total: Number, count: Number })
</script>

<template>
  <v-row dense class="mt-2">
    <v-col cols="6">
      <v-card
        elevation="2"
        class="pa-4 d-flex flex-column justify-center"
      >
        <div class="text-caption text-medium-emphasis">Total Collected</div>
        <div class="text-h6 font-weight-bold mt-1">₹{{ total }}</div>
      </v-card>
    </v-col>

    <v-col cols="6">
      <v-card
        elevation="2"
        class="pa-4 d-flex flex-column justify-center"
      >
        <div class="text-caption text-medium-emphasis">Payments Count</div>
        <div class="text-h6 font-weight-bold mt-1">{{ count }}</div>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
.v-card {
  background: linear-gradient(to bottom right, #ffffff, #f6f8fa);
}
</style>
