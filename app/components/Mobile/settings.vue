<template>
  <v-list density="comfortable" nav>
    <v-list-subheader class="text-uppercase font-weight-bold">
      Settings
    </v-list-subheader>

    <v-list-item
      v-for="(item, i) in items"
      :key="i"
      rounded="lg"
      class="mb-1 report-item"
      :to="item.to"
    >
      <template #prepend>
        <v-avatar size="36" color="primary" variant="tonal">
          <v-icon :icon="item.icon" />
        </v-avatar>
      </template>

      <v-list-item-title class="font-weight-medium">
        {{ item.text }}
      </v-list-item-title>

      <template #append>
        <v-icon
          icon="mdi-chevron-right"
          size="18"
          class="text-medium-emphasis"
        />
      </template>
    </v-list-item>
  </v-list>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
  },
});
</script>

<style scoped>
.report-item {
  transition: background-color 0.2s ease, transform 0.15s ease;
}

.report-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
  transform: translateX(2px);
}
</style>
