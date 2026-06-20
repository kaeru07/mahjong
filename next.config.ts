import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Capacitor で iOS アプリに包めるよう静的書き出し（out/ を生成）。
  output: "export",
  // 静的書き出しでは next/image の最適化サーバが使えないため無効化。
  images: { unoptimized: true },
  // 静的ホスティング / WebView でのパス解決を安定させる。
  trailingSlash: true,
};

export default nextConfig;
