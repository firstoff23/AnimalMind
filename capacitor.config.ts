import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.animalmind.app",
  appName: "PetSense",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
    url: "https://animalmind.vercel.app",
  },
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
    },
  },
};

export default config;
