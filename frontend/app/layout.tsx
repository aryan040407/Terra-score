import type { Metadata } from "next";
import "@/styles/globals.css";
import "leaflet/dist/leaflet.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "TerraScore — Climate Risk Intelligence",
  description: "TerraScore transforms localized climate and agricultural data into a dynamic risk intelligence signal for lenders and insurers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%231e4230'/%3E%3Cpath d='M8 21c3-8 8-11 16-11-1 8-6 12-13 12' stroke='%23a7f3d0' stroke-width='2.2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E" /></head>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
