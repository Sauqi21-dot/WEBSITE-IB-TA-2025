import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galeri · IB 2025",
};

export default function GaleriLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
