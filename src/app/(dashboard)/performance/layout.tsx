export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
