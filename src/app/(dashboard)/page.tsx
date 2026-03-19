import { Suspense } from "react";
import { getDashboardData } from "@/lib/dashboard-data";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { PerformanceCard } from "@/components/dashboard/performance-card";
import { TopPositions } from "@/components/dashboard/top-positions";
import { LastUpdated } from "@/components/dashboard/last-updated";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getDashboardData();

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-foreground">
          Hi, {data.userDisplayName} 👋
        </h1>
        <LastUpdated isoTimestamp={data.lastUpdated} />
      </div>

      {/* Metric Cards */}
      <Suspense
        fallback={
          <div className="flex flex-col gap-3">
            <div className="h-28 rounded-xl border border-border bg-muted animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 rounded-xl border border-border bg-muted animate-pulse" />
              <div className="h-20 rounded-xl border border-border bg-muted animate-pulse" />
            </div>
          </div>
        }
      >
        <MetricCards
          totalEquity={data.totalEquity}
          portfolioValue={data.portfolioValue}
          cashBalance={data.cashBalance}
          dailyPnl={data.dailyPnl}
          dailyPnlPercent={data.dailyPnlPercent}
          ytdPnl={data.ytdPnl}
        />
      </Suspense>

      {/* Performance TWR vs IHSG */}
      <PerformanceCard 
        ytdTwr={data.ytdTwr} 
        ihsgQuote={data.ihsgQuote} 
        ihsgYtdReturn={data.ihsgYtdReturn} 
      />

      {/* Top Positions */}
      <TopPositions holdings={data.holdings} />
    </div>
  );
}
