import { Suspense } from "react";
import { getDashboardData } from "@/lib/dashboard-data";
import { StockCard } from "@/components/dashboard/stock-card";
import { Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StocksPage() {
  const data = await getDashboardData();
  const { holdings } = data;

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Briefcase className="size-5 text-primary" /> Active Stocks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your current open positions and risk metrics.
        </p>
      </div>

      {/* Holdings List */}
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <div className="h-48 rounded-xl border border-border bg-muted animate-pulse" />
            <div className="h-48 rounded-xl border border-border bg-muted animate-pulse" />
            <div className="h-48 rounded-xl border border-border bg-muted animate-pulse" />
          </div>
        }
      >
        {holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-border rounded-xl">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Briefcase className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              No active positions
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
              You don&apos;t have any open stock positions. Tap the + button to log a Buy trade.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {holdings.map((holding) => (
              <StockCard key={holding.ticker} holding={holding} />
            ))}
          </div>
        )}
      </Suspense>
    </div>
  );
}
