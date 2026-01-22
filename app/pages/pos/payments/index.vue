<script setup>
import { ref, onMounted } from 'vue'
import { usePayment } from '@/composables/pos/usePayment'

const props = defineProps({
  companyId: String,
  invoiceId: { type: String, default: null }
})

const { getInvoicePayments, getCompanyPayments } = usePayment()

const payments = ref([])

const loadPayments = async () => {
  payments.value = props.invoiceId
    ? await getInvoicePayments(props.invoiceId)
    : await getCompanyPayments(props.companyId)
}

onMounted(loadPayments)
</script>

<template>
  <v-container fluid class="pa-3">
    <Mobile-PaymentStats
      :total="payments.reduce((s,p)=>s+p.amount,0)"
      :count="payments.length"
    />

    <Mobile-PaymentList :items="payments" />
  </v-container>
</template>