<template>
  <v-app class="bg-grey-lighten-3">
    <HeaderBar
      v-model="drawer"
      v-model:rail="rail"
      :user="user"
    />
    <v-main>
        <slot />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from "vue";

const drawer = ref(true);
const rail = ref(true);

const user = {
  name: "Bucksbox Admin",
  avatar: "/avatar.png",
};

</script>
