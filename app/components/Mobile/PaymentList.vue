// components/PaymentList.vue
<script setup>
const props = defineProps({ items: Array })

const iconByMethod = (m) => ({
  CASH: 'mdi-cash',
  UPI: 'mdi-qrcode',
  CARD: 'mdi-credit-card',
  BANK: 'mdi-bank'
}[m] || 'mdi-cash')
</script>

<template>
  <v-card rounded="2xl" elevation="2" class="mt-4">
    <v-list density="comfortable">
      <v-list-item
        v-for="p in items"
        :key="p.id"
        :prepend-icon="iconByMethod(p.method)"
      >
        <v-list-item-title class="font-weight-medium">
          ₹{{ p.amount }} • {{ p.method }}
        </v-list-item-title>
        <v-list-item-subtitle>
          {{ new Date(p.date).toLocaleString() }}
          <span v-if="p.reference"> • Ref: {{ p.reference }}</span>
          <span v-if="p.type"> • {{ p.type }}</span>
        </v-list-item-subtitle>
      </v-list-item>

      <v-list-item v-if="!items.length">
        <v-list-item-title class="text-center text-medium-emphasis">
          No payments found
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-card>
</template>