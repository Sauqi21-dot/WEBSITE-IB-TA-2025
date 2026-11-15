import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const newsreader = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-newsreader",
  display: "swap",
});

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-sans-3",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IB 2025 · D3 Manajemen Informatika · Polsri",
  description: "Website arsip dan informasi kelas 3IB (D3 Manajemen Informatika, Politeknik Negeri Sriwijaya). Tagline: IB JOSJIS.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#065F46",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${newsreader.variable} ${sourceSans3.variable}`}>
      <body className="min-h-screen flex flex-col bg-ib-bg text-ib-text antialiased selection:bg-ib-dark selection:text-white">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
