import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "麻雀問題アプリ",
  description: "麻雀の問題を解いて実力アップ",
};

// iOS Capacitor / TestFlight 実機で、ステータスバー・Dynamic Island・ホームインジケータの
// safe area を CSS の env(safe-area-inset-*) から取得できるようにする。
// viewport-fit=cover が無いと env() が 0 を返し、上部UIがステータスバーに被る。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
