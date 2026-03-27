<template>
  <Web-settings 
    v-if="!device.isMobile" 
    :items="items"
    @item-click="handleItemClick"
  />
  
  <Mobile-settings 
    v-else 
    :items="items"
    @item-click="handleItemClick"
  />
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const items = ref([
  { text: "Printer", icon: "mdi-printer", to: "/pos/settings/printer" },
  { text: "Tax Rate", icon: "mdi-cash", to: "/pos/settings/taxrate" },
  { text: "Logout", icon: "mdi-logout", action: "logout" }
]);

const device = useDevice();

definePageMeta({
  title: "SETTINGS",
  showBack: true,
});

// 👇 Handle click
const handleItemClick = (item) => {
  if (item.action === "logout") {
    logout();
  } else if (item.to) {
    router.push(item.to);
  }
};

// 👇 Logout function
const logout = async () => {
  if (!confirm("Are you sure you want to logout?")) return;

  try {
    // 🔹 Optional: call backend logout API
    // await axios.post("/logout");

    // 🔹 Clear only auth-related data (preferred)
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("auth");

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // 🔹 If your app depends fully on storage → then clear all
    sessionStorage.clear();
    localStorage.clear();

    // 🔹 Clear cookies (important if backend uses them)
    document.cookie.split(";").forEach((cookie) => {
      document.cookie = cookie
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;");
    });

    // 🔹 Prevent back navigation after logout
    router.replace("/login");
    setTimeout(() => {
    window.location.reload();
  }, 100);

  } catch (error) {
    console.error("Logout error:", error);
  }
};
</script>