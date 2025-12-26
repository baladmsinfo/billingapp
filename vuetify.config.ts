import { defineVuetifyConfiguration } from "vuetify-nuxt-module/custom-configuration";

export default defineVuetifyConfiguration({
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
        colors: {
          primary: "#4F46E5",     // Indigo
          secondary: "#10B981",   // Mint green
          accent: "#06B6D4",      // Cyan
          background: "#FAFAFA",  // Soft gray-blue
          surface: "#FFFFFF",     // Clean white
        },
      },
    },
  },
});
