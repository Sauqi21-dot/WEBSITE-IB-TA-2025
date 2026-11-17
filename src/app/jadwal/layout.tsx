import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jadwal · IB 2025",
};

export default function JadwalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
