import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kas Kelas · IB 2025",
};

export default function KasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
