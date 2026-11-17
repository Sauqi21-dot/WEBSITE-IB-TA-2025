import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil Saya · IB 2025",
};

export default function ProfilLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
