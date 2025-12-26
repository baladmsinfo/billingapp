<template>
  <v-row>
    <v-col
      v-for="p in products"
      :key="p.id"
      cols="6"
      md="4"
    >
      <v-card class="product-card" @click="$emit('add', p)">
        <v-card-title class="text-body-1">
          {{ p.name }}
        </v-card-title>
        <v-card-subtitle>
          ₹{{ p.price }}
        </v-card-subtitle>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
defineProps({ products: Array })
defineEmits(["add"])
</script>

<style scoped>
.product-card {
  cursor: pointer;
  transition: transform 0.15s ease;
}
.product-card:hover {
  transform: scale(1.03);
}
</style>
