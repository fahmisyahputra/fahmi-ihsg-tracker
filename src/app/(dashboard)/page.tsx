import { Suspense } from "react";
import { getDashboardData } from "@/lib/dashboard-data";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { PerformanceCard } from "@/components/dashboard/performance-card";
import { TopPositions } from "@/components/dashboard/top-positions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getDashboardData();

  // Extract first name from email for greeting
  const name = data.userEmail.split("@")[0];

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-lg font-bold text-foreground">
          Hi, {name} 👋
        </h1>
        <p className="text-xs text-muted-foreground">
          Here&apos;s your portfolio overview
        </p>
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
        />
      </Suspense>

      {/* Performance TWR vs IHSG */}
      <PerformanceCard ytdTwr={data.ytdTwr} ihsgQuote={data.ihsgQuote} />

      {/* Top Positions */}
      <TopPositions holdings={data.holdings} />
    </div>
  );
}
