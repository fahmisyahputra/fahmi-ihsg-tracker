"use client";

import { Trophy } from "lucide-react";
import { formatIDR } from "@/lib/twr";
import { cn } from "@/lib/utils";
import type { IpoAnalytics } from "@/lib/analytics-data";

interface IpoHallOfFameWidgetProps {
  data: IpoAnalytics | null;
  loading?: boolean;
  timeframeLabel?: string;
}

export function IpoHallOfFameWidget({
  data,
  loading,
  timeframeLabel,
}: IpoHallOfFameWidgetProps) {
  if (!data || data.hallOfFame.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="size-3.5 text-amber-500" /> IPO Hall of Fame
          </div>
          {timeframeLabel && <span className="font-normal opacity-70">{timeframeLabel}</span>}
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-amber-500/10 p-3 rounded-full mb-3">
            <Trophy className="size-6 text-amber-500 opacity-50" />
          </div>
          <p className="text-xs font-bold text-foreground mb-1">No IPO Trades</p>
          <p className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
            Record closed IPO trades to see your Hall of Fame.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-opacity duration-300",
        loading && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Trophy className="size-3.5 text-amber-500" /> IPO Hall of Fame (Per-Trade ROI)
        </h2>
        {timeframeLabel && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
            {timeframeLabel}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/50">
              <th className="pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
                Ticker
              </th>
              <th className="pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right font-sans">
                Realized PnL
              </th>
              <th className="pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right font-sans">
                Allotted ROI
              </th>
              <th className="pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right font-sans">
                Locked ROI
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {data.hallOfFame.map((item, index) => {
              const isProfit = item.pnl >= 0;
              return (
                <tr
                  key={item.ticker + index}
                  className="group hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono">
                        {item.ticker}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={cn(
                        "text-xs font-bold font-mono",
                        isProfit ? "text-profit" : "text-loss"
                      )}
                    >
                      {isProfit ? "+" : ""}
                      {formatIDR(item.pnl)}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={cn(
                        "text-xs font-bold font-mono",
                        item.allottedRoi >= 0 ? "text-profit" : "text-loss"
                      )}
                    >
                      {item.allottedRoi >= 0 ? "+" : ""}
                      {item.allottedRoi}%
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={cn(
                        "text-[11px] font-medium font-mono text-muted-foreground"
                      )}
                    >
                      {item.lockedRoi >= 0 ? "+" : ""}
                      {item.lockedRoi}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
