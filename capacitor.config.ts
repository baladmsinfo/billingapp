import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.buckscloudpos.in",
  appName: "buckspos",
  webDir: "dist",
  server: {
    url: "http://192.168.31.83:3000",
    cleartext: true,
  },
  plugins: {
    EdgeToEdge: {
      //backgroundColor: '#8e2de2' // Optional UI polish
    },
  },
  android: {
    adjustMarginsForEdgeToEdge: "force", // Helps layout compensate correctly
  },
};

export default config;
