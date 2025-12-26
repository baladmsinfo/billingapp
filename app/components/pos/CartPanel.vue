<template>
  <v-card class="fill-height d-flex flex-column">

    <v-card-title class="text-h6">
      Current Order
    </v-card-title>

    <v-divider />

    <v-card-text class="flex-grow-1 overflow-y-auto">
      <v-list>
        <v-list-item
          v-for="i in cart?.items"
          :key="i.id"
        >
          <v-list-item-title>{{ i.name }}</v-list-item-title>

          <template #append>
            <v-btn icon @click="$emit('updateQty', { cart_item_id: i.id, quantity: i.quantity - 1 })">−</v-btn>
            {{ i.quantity }}
            <v-btn icon @click="$emit('updateQty', { cart_item_id: i.id, quantity: i.quantity + 1 })">+</v-btn>

            <v-btn icon color="red" @click="$emit('remove', i.id)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>

    <v-divider />

    <v-card-actions class="justify-space-between">
      <div class="text-h6">₹{{ cart?.total_amount }}</div>
      <v-btn color="primary" size="large" @click="$emit('checkout')">
        Checkout
      </v-btn>
    </v-card-actions>

  </v-card>
</template>

<script setup>
defineProps({ cart: Object })
defineEmits(["updateQty", "remove", "checkout"])
</script>
