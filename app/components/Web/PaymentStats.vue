<script setup>
const props = defineProps({ total: Number, count: Number })
</script>

<template>
  <!-- Section Header -->
  <v-row align="center" class="mb-3">
    <v-col cols="12">
      <h2 class="font-weight-bold">Payments Overview</h2>
    </v-col>
  </v-row>

  <!-- Desktop Stat Cards -->
  <v-row dense>
    <v-col cols="6">
      <v-card elevation="1" class="pa-4 stat-card">
        <div class="text-caption text-grey">Total Collected</div>
        <div class="text-h5 font-weight-bold mt-1">₹{{ total }}</div>
      </v-card>
    </v-col>

    <v-col cols="6">
      <v-card elevation="1" class="pa-4 stat-card">
        <div class="text-caption text-grey">Payments Count</div>
        <div class="text-h5 font-weight-bold mt-1">{{ count }}</div>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
.stat-card {
  border: 1px solid #e6e6e6;
  background: #fff;
  border-radius: 12px;
  transition: 0.2s;
}
.stat-card:hover {
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
}
</style>
