import { cn } from "@/lib/utils";
import { formatReturnPercent } from "@/lib/twr";
import type { StockQuote } from "@/lib/stock-api";
import { ArrowUpRight, ArrowDownRight, Activity, Info } from "lucide-react";
import { PerformanceReasoningModal } from "./performance-reasoning-modal";

interface PerformanceCardProps {
  ytdTwr: number;
  ytdMwr: number;
  ihsgQuote: StockQuote | null;
  ihsgYtdReturn: number;
  // Calculation breakdowns
  startingEquityYTD: number;
  netCashFlowYTD: number;
  totalEquity: number;
  xirrCashFlows: { date: string; amount: number; type: string }[];
}

export function PerformanceCard({ 
  ytdTwr, 
  ytdMwr, 
  ihsgQuote, 
  ihsgYtdReturn,
  startingEquityYTD,
  netCashFlowYTD,
  totalEquity,
  xirrCashFlows
}: PerformanceCardProps) {
  const ihsgChange = ihsgQuote?.regularMarketChangePercent ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-3">
        <Activity className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Performance
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Your YTD TWR */}
        <PerformanceReasoningModal
          type="TWR"
          value={ytdTwr}
          startingEquity={startingEquityYTD}
          netCashFlow={netCashFlowYTD}
          currentEquity={totalEquity}
          trigger={
            <button className="group flex flex-col items-center text-center p-2 rounded-lg bg-accent/30 border border-border/50 transition-all hover:bg-accent/50 hover:border-border active:scale-[0.98]">
              <div className="flex items-center gap-1">
                <p className="text-[10px] font-medium uppercase tracking-tight text-muted-foreground whitespace-nowrap">
                  YTD TWR
                </p>
                <Info className="size-2.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="mt-1 flex items-center justify-center gap-1">
                {ytdTwr > 0 ? (
                  <ArrowUpRight className="size-4 text-profit" />
                ) : ytdTwr < 0 ? (
                  <ArrowDownRight className="size-4 text-loss" />
                ) : (
                  <Activity className="size-4 text-muted-foreground/50" />
                )}
                <span
                  className={cn(
                    "text-lg font-bold font-mono tracking-tighter",
                    ytdTwr > 0 ? "text-profit" : ytdTwr < 0 ? "text-loss" : "text-muted-foreground"
                  )}
                >
                  {formatReturnPercent(ytdTwr)}
                </span>
              </div>
              <p className="mt-0.5 text-[9px] text-zinc-400 font-medium uppercase">
                Time-Weighted
              </p>
            </button>
          }
        />

        {/* Your YTD MWR (XIRR) */}
        <PerformanceReasoningModal
          type="MWR"
          value={ytdMwr}
          currentEquity={totalEquity}
          cashFlows={xirrCashFlows}
          trigger={
            <button className="group flex flex-col items-center text-center p-2 rounded-lg bg-accent/30 border border-border/50 transition-all hover:bg-accent/50 hover:border-border active:scale-[0.98]">
              <div className="flex items-center gap-1">
                <p className="text-[10px] font-medium uppercase tracking-tight text-muted-foreground whitespace-nowrap">
                  YTD MWR
                </p>
                <Info className="size-2.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="mt-1 flex items-center justify-center gap-1">
                {ytdMwr > 0 ? (
                  <ArrowUpRight className="size-4 text-profit" />
                ) : ytdMwr < 0 ? (
                  <ArrowDownRight className="size-4 text-loss" />
                ) : (
                  <Activity className="size-4 text-muted-foreground/50" />
                )}
                <span
                  className={cn(
                    "text-lg font-bold font-mono tracking-tighter",
                    ytdMwr > 0 ? "text-profit" : ytdMwr < 0 ? "text-loss" : "text-muted-foreground"
                  )}
                >
                  {formatReturnPercent(ytdMwr)}
                </span>
              </div>
              <p className="mt-0.5 text-[9px] text-zinc-400 font-medium uppercase">
                Money-Weighted
              </p>
            </button>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* IHSG Today */}
        <div className="flex flex-col items-center text-center p-1.5 rounded-lg border border-dashed border-border">
          <p className="text-[10px] font-medium uppercase tracking-tight text-muted-foreground whitespace-nowrap">
            IHSG Today
          </p>
          <div className="mt-1 flex items-center justify-center gap-1">
            {ihsgChange >= 0 ? (
              <ArrowUpRight className="size-3 text-profit" />
            ) : (
              <ArrowDownRight className="size-3 text-loss" />
            )}
            <span
              className={cn(
                "text-sm font-bold font-mono tracking-tighter",
                ihsgChange >= 0 ? "text-profit" : "text-loss"
              )}
            >
              {formatReturnPercent(ihsgChange)}
            </span>
          </div>
          <p className="mt-0.5 text-[9px] text-zinc-500 font-medium whitespace-nowrap">
            {ihsgQuote
              ? `${ihsgQuote.regularMarketPrice.toLocaleString("id-ID")} pts`
              : "..."}
          </p>
        </div>

        {/* IHSG YTD */}
        <div className="flex flex-col items-center text-center p-1.5 rounded-lg border border-dashed border-border">
          <p className="text-[10px] font-medium uppercase tracking-tight text-muted-foreground whitespace-nowrap">
            IHSG YTD
          </p>
          <div className="mt-1 flex items-center justify-center gap-1">
            {ihsgYtdReturn >= 0 ? (
              <ArrowUpRight className="size-3 text-profit" />
            ) : (
              <ArrowDownRight className="size-3 text-loss" />
            )}
            <span
              className={cn(
                "text-sm font-bold font-mono tracking-tighter",
                ihsgYtdReturn >= 0 ? "text-profit" : "text-loss"
              )}
            >
              {formatReturnPercent(ihsgYtdReturn)}
            </span>
          </div>
          <p className="mt-0.5 text-[9px] text-zinc-500 font-medium whitespace-nowrap uppercase">
            Market Benchmark
          </p>
        </div>
      </div>
    </div>
  );
}
