import { cn } from "@/lib/utils";
import { formatReturnPercent } from "@/lib/twr";
import type { StockQuote } from "@/lib/stock-api";
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

interface PerformanceCardProps {
  ytdTwr: number;
  ihsgQuote: StockQuote | null;
}

export function PerformanceCard({ ytdTwr, ihsgQuote }: PerformanceCardProps) {
  const ihsgChange = ihsgQuote?.regularMarketChangePercent ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-3">
        <Activity className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Performance
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Your YTD TWR */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Your YTD TWR
          </p>
          <div className="mt-1 flex items-center gap-1">
            {ytdTwr >= 0 ? (
              <ArrowUpRight className="size-4 text-profit" />
            ) : (
              <ArrowDownRight className="size-4 text-loss" />
            )}
            <span
              className={cn(
                "text-xl font-bold font-mono",
                ytdTwr >= 0 ? "text-profit" : "text-loss"
              )}
            >
              {formatReturnPercent(ytdTwr)}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Time-Weighted Return
          </p>
        </div>

        {/* IHSG YTD */}
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
                "text-xl font-bold font-mono",
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
      </div>
    </div>
  );
}
