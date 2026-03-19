import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatIDR, formatReturnPercent } from "@/lib/twr";
import type { Holding } from "@/lib/dashboard-data";
import { TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

interface StockCardProps {
  holding: Holding;
}

export function StockCard({ holding }: StockCardProps) {
  const currentPrice = holding.quote?.regularMarketPrice ?? holding.avgPrice;
  const dailyChange = holding.quote?.regularMarketChangePercent ?? 0;
  const isPositive = holding.unrealizedPnl >= 0;

  // Cutloss 5% calculation
  const cutlossPrice = Math.floor(holding.avgPrice * 0.95);
  // Re-calculate how much we would lose if we sell everything at the cutloss price
  const cutlossValue = holding.totalShares * cutlossPrice;
  const cutlossLoss = holding.costBasis - cutlossValue;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-4">
      {/* Header: Ticker, PnL Badge, Allocation */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold font-mono text-foreground leading-none">
              {holding.ticker}
            </h3>
            <span className="text-[10px] font-semibold text-muted-foreground border border-border rounded px-1.5 py-0.5">
              {holding.allocation.toFixed(1)}% of Eq
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            {holding.lots} Lots · Avg {formatIDR(holding.avgPrice)}
          </p>
        </div>
        <div className="text-right">
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
            <span className="text-[10px] text-muted-foreground">today</span>
          </div>
        </div>
      </div>

      {/* Floating PnL */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Floating PnL
          </p>
          <p
            className={cn(
              "mt-0.5 font-mono text-sm font-bold",
              isPositive ? "text-profit" : "text-loss"
            )}
          >
            {isPositive ? "+" : ""}
            {formatIDR(holding.unrealizedPnl)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Return %
          </p>
          <div className="mt-0.5 flex items-center justify-end gap-1">
            {isPositive ? (
              <TrendingUp className="size-3.5 text-profit" />
            ) : (
              <TrendingDown className="size-3.5 text-loss" />
            )}
            <p
              className={cn(
                "font-mono text-sm font-bold",
                isPositive ? "text-profit" : "text-loss"
              )}
            >
              {formatReturnPercent(holding.unrealizedPnlPercent)}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Indicator - 5% Cutloss strict metric */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-loss-muted text-loss">
          <AlertTriangle className="size-3" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">
            Strict 5% Cutloss @ {formatIDR(cutlossPrice)}
          </p>
          <p className="text-muted-foreground">
            Max Risk: <span className="text-loss font-mono">-{formatIDR(cutlossLoss)}</span>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <Link
          href={`?action=trade-buy&ticker=${holding.ticker}`}
          replace
          scroll={false}
          className="flex h-9 items-center justify-center rounded-md bg-profit-muted text-profit font-semibold text-xs hover:bg-profit hover:text-white transition-colors"
        >
          Buy More
        </Link>
        <Link
          href={`?action=trade-sell&ticker=${holding.ticker}`}
          replace
          scroll={false}
          className="flex h-9 items-center justify-center rounded-md bg-loss-muted text-loss font-semibold text-xs hover:bg-loss hover:text-white transition-colors"
        >
          Sell
        </Link>
        <button
          type="button"
          disabled
          className="flex h-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground font-semibold text-xs opacity-50 cursor-not-allowed"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
