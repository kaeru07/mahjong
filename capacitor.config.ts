import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kaeru07.mahjong",
  appName: "Mahjong",
  // Next.js の静的書き出し先（next.config.ts の output: 'export' が out/ を生成）。
  webDir: "out",
};

export default config;
