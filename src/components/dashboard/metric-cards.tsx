import { cn } from "@/lib/utils";
import { formatIDR, formatReturnPercent } from "@/lib/twr";
import { Wallet, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface MetricCardsProps {
  totalEquity: number;
  portfolioValue: number;
  cashBalance: number;
  dailyPnl: number;
  dailyPnlPercent: number;
}

export function MetricCards({
  totalEquity,
  portfolioValue,
  cashBalance,
  dailyPnl,
  dailyPnlPercent,
}: MetricCardsProps) {
  const isPositive = dailyPnl >= 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Total Equity — hero card */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total Equity
          </p>
          <BarChart3 className="size-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-[28px] font-extrabold leading-none tracking-tight font-mono text-foreground">
          {formatIDR(totalEquity)}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp className="size-3.5 text-profit" />
          ) : (
            <TrendingDown className="size-3.5 text-loss" />
          )}
          <span
            className={cn(
              "text-xs font-semibold font-mono",
              isPositive ? "text-profit" : "text-loss"
            )}
          >
            {formatIDR(Math.abs(dailyPnl))} ({formatReturnPercent(dailyPnlPercent)})
          </span>
          <span className="text-xs text-muted-foreground">today</span>
        </div>
      </div>

      {/* Portfolio + Cash — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-primary" />
            <p className="text-xs font-medium text-muted-foreground">Portfolio</p>
          </div>
          <p className="mt-1.5 text-base font-bold font-mono text-foreground leading-none">
            {formatIDR(portfolioValue)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5">
            <Wallet className="size-3.5 text-primary" />
            <p className="text-xs font-medium text-muted-foreground">Cash (RDN)</p>
          </div>
          <p className="mt-1.5 text-base font-bold font-mono text-foreground leading-none">
            {formatIDR(cashBalance)}
          </p>
        </div>
      </div>
    </div>
  );
}
