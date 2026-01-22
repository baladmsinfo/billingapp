// components/PaymentStats.vue
<script setup>
const props = defineProps({ total: Number, count: Number })
</script>

<template>
  <v-row dense>
    <v-col cols="6">
      <v-card elevation="2" rounded="2xl" class="pa-3">
        <div class="text-caption">Total Collected</div>
        <div class="text-h6 font-weight-bold">₹{{ total }}</div>
      </v-card>
    </v-col>
    <v-col cols="6">
      <v-card elevation="2" rounded="2xl" class="pa-3">
        <div class="text-caption">Payments</div>
        <div class="text-h6 font-weight-bold">{{ count }}</div>
      </v-card>
    </v-col>
  </v-row>
</template>