import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pawra.app",
  appName: "Pawra",
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
