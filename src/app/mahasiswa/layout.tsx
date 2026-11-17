import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mahasiswa · IB 2025",
};

export default function MahasiswaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
