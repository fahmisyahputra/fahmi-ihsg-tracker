import { cn } from "@/lib/utils";
import { formatReturnPercent } from "@/lib/twr";
import type { StockQuote } from "@/lib/stock-api";
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

interface PerformanceCardProps {
  ytdTwr: number;
  ihsgQuote: StockQuote | null;
  ihsgYtdReturn: number;
}

export function PerformanceCard({ ytdTwr, ihsgQuote, ihsgYtdReturn }: PerformanceCardProps) {
  const ihsgChange = ihsgQuote?.regularMarketChangePercent ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-3">
        <Activity className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Performance
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-2">
        {/* Your YTD TWR */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Your YTD TWR
          </p>
          <div className="mt-1 flex items-center gap-1">
            {ytdTwr > 0 ? (
              <ArrowUpRight className="size-4 text-profit" />
            ) : ytdTwr < 0 ? (
              <ArrowDownRight className="size-4 text-loss" />
            ) : (
              <Activity className="size-4 text-muted-foreground/50" />
            )}
            <span
              className={cn(
                "text-xl font-bold font-mono tracking-tight",
                ytdTwr > 0 ? "text-profit" : ytdTwr < 0 ? "text-loss" : "text-muted-foreground"
              )}
            >
              {formatReturnPercent(ytdTwr)}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Portfolio
          </p>
        </div>

        {/* IHSG Today */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            IHSG Today
          </p>
          <div className="mt-1 flex items-center gap-1">
            {ihsgChange >= 0 ? (
              <ArrowUpRight className="size-4 text-profit" />
            ) : (
              <ArrowDownRight className="size-4 text-loss" />
            )}
            <span
              className={cn(
                "text-xl font-bold font-mono tracking-tight",
                ihsgChange >= 0 ? "text-profit" : "text-loss"
              )}
            >
              {formatReturnPercent(ihsgChange)}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {ihsgQuote
              ? `${ihsgQuote.regularMarketPrice.toLocaleString("id-ID")} pts`
              : "Loading..."}
          </p>
        </div>

        {/* IHSG YTD */}
        <div className="col-span-2 lg:col-span-1 pt-2 lg:pt-0 border-t border-border/50 lg:border-t-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            IHSG YTD
          </p>
          <div className="mt-1 flex items-center gap-1">
            {ihsgYtdReturn >= 0 ? (
              <ArrowUpRight className="size-4 text-profit" />
            ) : (
              <ArrowDownRight className="size-4 text-loss" />
            )}
            <span
              className={cn(
                "text-xl font-bold font-mono tracking-tight",
                ihsgYtdReturn >= 0 ? "text-profit" : "text-loss"
              )}
            >
              {formatReturnPercent(ihsgYtdReturn)}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Market Benchmark
          </p>
        </div>
      </div>
    </div>
  );
}
