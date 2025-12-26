<template>
  <v-chip-group
    v-model="model"
    mandatory
    class="mb-4"
    selected-class="bg-primary text-white"
  >
    <v-chip
      v-for="c in categories"
      :key="c.id"
      :value="c.id"
      filter
    >
      {{ c.name }}
    </v-chip>
  </v-chip-group>
</template>

<script setup>
defineProps({
  categories: Array,
  modelValue: String
})
defineEmits(["update:modelValue"])
</script>
