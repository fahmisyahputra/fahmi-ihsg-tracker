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

      <div className="grid grid-cols-3 gap-1 w-full">
        {/* Your YTD TWR */}
        <div className="flex flex-col items-center text-center">
          <p className="text-[10px] font-medium uppercase tracking-tight text-muted-foreground whitespace-nowrap">
            Your YTD TWR
          </p>
          <div className="mt-1 flex items-center justify-center gap-1">
            {ytdTwr > 0 ? (
              <ArrowUpRight className="size-3.5 text-profit" />
            ) : ytdTwr < 0 ? (
              <ArrowDownRight className="size-3.5 text-loss" />
            ) : (
              <Activity className="size-3.5 text-muted-foreground/50" />
            )}
            <span
              className={cn(
                "text-base font-bold font-mono tracking-tighter",
                ytdTwr > 0 ? "text-profit" : ytdTwr < 0 ? "text-loss" : "text-muted-foreground"
              )}
            >
              {formatReturnPercent(ytdTwr)}
            </span>
          </div>
          <p className="mt-0.5 text-[9px] text-zinc-400 font-medium">
            Portfolio
          </p>
        </div>

        {/* IHSG Today */}
        <div className="flex flex-col items-center text-center">
          <p className="text-[10px] font-medium uppercase tracking-tight text-muted-foreground whitespace-nowrap">
            IHSG Today
          </p>
          <div className="mt-1 flex items-center justify-center gap-1">
            {ihsgChange >= 0 ? (
              <ArrowUpRight className="size-3.5 text-profit" />
            ) : (
              <ArrowDownRight className="size-3.5 text-loss" />
            )}
            <span
              className={cn(
                "text-base font-bold font-mono tracking-tighter",
                ihsgChange >= 0 ? "text-profit" : "text-loss"
              )}
            >
              {formatReturnPercent(ihsgChange)}
            </span>
          </div>
          <p className="mt-0.5 text-[9px] text-zinc-400 font-medium whitespace-nowrap">
            {ihsgQuote
              ? `${ihsgQuote.regularMarketPrice.toLocaleString("id-ID")} pts`
              : "..."}
          </p>
        </div>

        {/* IHSG YTD */}
        <div className="flex flex-col items-center text-center">
          <p className="text-[10px] font-medium uppercase tracking-tight text-muted-foreground whitespace-nowrap">
            IHSG YTD
          </p>
          <div className="mt-1 flex items-center justify-center gap-1">
            {ihsgYtdReturn >= 0 ? (
              <ArrowUpRight className="size-3.5 text-profit" />
            ) : (
              <ArrowDownRight className="size-3.5 text-loss" />
            )}
            <span
              className={cn(
                "text-base font-bold font-mono tracking-tighter",
                ihsgYtdReturn >= 0 ? "text-profit" : "text-loss"
              )}
            >
              {formatReturnPercent(ihsgYtdReturn)}
            </span>
          </div>
          <p className="mt-0.5 text-[9px] text-zinc-400 font-medium whitespace-nowrap">
            Market Benchmark
          </p>
        </div>
      </div>
    </div>
  );
}
