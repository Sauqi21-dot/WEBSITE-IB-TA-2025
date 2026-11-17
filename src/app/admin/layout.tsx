import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel Admin · IB 2025",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
