<script setup>
import { ref, onMounted } from "vue"
import { useDevice } from "#imports"
import { usePayment } from "@/composables/pos/usePayment"

const device = useDevice()
const COMPANY_ID = "LOCAL_COMPANY"

const { listPaymentsByCompany } = usePayment()

/* ------------------------------------
   STATE
------------------------------------ */
const payments = ref([])
const visiblePayments = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const perPage = 10
const hasMore = ref(false)

/* ------------------------------------
   LOAD INITIAL DATA
------------------------------------ */
const loadPayments = async () => {
  loading.value = true

  const all = await listPaymentsByCompany({ company_id: COMPANY_ID })
  payments.value = all || []

  visiblePayments.value = payments.value.slice(0, perPage)
  hasMore.value = payments.value.length > visiblePayments.value.length

  loading.value = false
}

/* ------------------------------------
   LOAD MORE (Mobile Only)
------------------------------------ */
const loadMore = () => {
  loadingMore.value = true

  setTimeout(() => {
    const next = visiblePayments.value.length + perPage
    visiblePayments.value = payments.value.slice(0, next)
    hasMore.value = payments.value.length > visiblePayments.value.length
    loadingMore.value = false
  }, 400)
}

/* ------------------------------------
   PAGE META
------------------------------------ */
definePageMeta({
  title: "Payments",
  showBack: true,
})

onMounted(loadPayments)
</script>

<template>
  <v-container fluid class="pa-3">

    <!-- WEB VERSION -->
    <template v-if="!device.isMobile">
      <Web-PaymentStats
        :total="payments.reduce((s, p) => s + p.amount, 0)"
        :count="payments.length"
      />

      <Web-PaymentList
        :items="payments"
        :loading="loading"
      />
    </template>

    <!-- MOBILE VERSION -->
    <template v-else>
      <Mobile-PaymentStats
        :total="payments.reduce((s, p) => s + p.amount, 0)"
        :count="payments.length"
      />

      <MobilePaymentList
        :items="visiblePayments"
        :loading="loading"
      />

      <!-- Load More (Mobile only) -->
      <v-row class="mt-2" v-if="hasMore && !loading">
        <v-col cols="12">
          <v-btn
            block
            variant="text"
            :loading="loadingMore"
            @click="loadMore"
          >
            Click here to Load more
          </v-btn>
        </v-col>
      </v-row>
    </template>

  </v-container>
</template>