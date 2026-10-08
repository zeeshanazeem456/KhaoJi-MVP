import type { Metadata, Viewport } from "next";
import "@fontsource-variable/rubik";
import "@fontsource/bungee/400.css";
import "@fontsource/noto-nastaliq-urdu/arabic-700.css";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { RegisterSW } from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "KhaoJi",
  description: "Campus food delivery for FAST Islamabad",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "KhaoJi", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#D9301F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
