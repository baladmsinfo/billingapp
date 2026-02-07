<template>
  <v-container fluid class="pa-4">

    <!-- HEADER -->
    <v-row align="center" class="mb-4">
      <v-col cols="6">
        <h2 class="text-h5 font-weight-bold">Settings</h2>
      </v-col>
    </v-row>

    <!-- SETTINGS TABLE -->
    <v-card elevation="1">
      <v-table>

        <!-- TABLE BODY -->
        <tbody>
          <tr 
            v-for="(item, i) in items" 
            :key="i" 
            class="settings-row"
            @click="$router.push(item.to)"
          >
            <!-- ICON + TEXT like your screenshot -->
            <td>
              <div class="d-flex align-center">
                <v-avatar size="36" color="primary" variant="tonal" class="mr-3">
                  <v-icon :icon="item.icon" />
                </v-avatar>

                <div class="text-body-1 font-weight-medium">
                  {{ item.text }}
                </div>
              </div>
            </td>

            <!-- CHEVRON -->
            <td class="text-right">
              <v-icon>mdi-chevron-right</v-icon>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

  </v-container>
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
.settings-row {
  cursor: pointer;
  transition: background 0.2s ease;
}

.settings-row:hover {
  background: rgba(var(--v-theme-primary), 0.05);
}
</style>