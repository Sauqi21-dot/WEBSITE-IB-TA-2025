import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login · IB 2025",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
