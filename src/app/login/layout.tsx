import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | StockTracker",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page uses its own layout without the AppShell (no header/bottom nav)
  return <>{children}</>;
}
