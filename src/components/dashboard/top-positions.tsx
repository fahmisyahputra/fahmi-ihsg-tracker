import { cn } from "@/lib/utils";
import { formatIDR, formatReturnPercent } from "@/lib/twr";
import type { Holding } from "@/lib/dashboard-data";
import { Briefcase } from "lucide-react";

interface TopPositionsProps {
  holdings: Holding[];
}

export function TopPositions({ holdings }: TopPositionsProps) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No stocks in your portfolio yet
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
        <Briefcase className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Top Holdings
        </h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {holdings.length} stocks
        </span>
      </div>

      {/* Holdings list */}
      <div className="divide-y divide-border">
        {holdings.map((holding, index) => {
          const isPositive = holding.unrealizedPnl >= 0;
          const currentPrice = holding.quote?.regularMarketPrice ?? holding.avgPrice;
          const dailyChange = holding.quote?.regularMarketChangePercent ?? 0;

          return (
            <div
              key={holding.ticker}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              {/* Rank + Ticker */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground">
                      {holding.ticker}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1 py-0.5 text-[10px] font-semibold leading-none",
                        isPositive
                          ? "bg-profit-muted text-profit"
                          : "bg-loss-muted text-loss"
                      )}
                    >
                      {formatReturnPercent(holding.unrealizedPnlPercent)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {holding.lots} lots · Avg {currentPrice.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* Value + Allocation */}
              <div className="text-right shrink-0">
                <p className="text-sm font-bold font-mono text-foreground">
                  {formatIDR(holding.marketValue)}
                </p>
                <div className="mt-0.5 flex items-center justify-end gap-1">
                  <span
                    className={cn(
                      "text-[10px] font-semibold font-mono",
                      dailyChange >= 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {formatReturnPercent(dailyChange)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    · {holding.allocation.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
