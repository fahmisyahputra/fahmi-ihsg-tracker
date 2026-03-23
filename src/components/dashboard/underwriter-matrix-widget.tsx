"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { formatIDR } from "@/lib/twr";
import { cn } from "@/lib/utils";
import type { IpoAnalytics, UnderwriterStats } from "@/lib/analytics-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UnderwriterMatrixWidgetProps {
  data: IpoAnalytics | null;
  loading?: boolean;
  timeframeLabel?: string;
}

export function UnderwriterMatrixWidget({
  data,
  loading,
  timeframeLabel,
}: UnderwriterMatrixWidgetProps) {
  if (!data || data.underwriters.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <Building2 className="size-3.5 text-amber-500" /> Underwriter Performance
          </div>
          {timeframeLabel && <span className="font-normal opacity-70">{timeframeLabel}</span>}
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-amber-500/10 p-3 rounded-full mb-3">
            <Building2 className="size-6 text-amber-500 opacity-50" />
          </div>
          <p className="text-xs font-bold text-foreground mb-1">No Underwriter Data</p>
          <p className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
            Record underwriter names in your IPO notes to track their performance.
          </p>
        </div>
      </div>
    );
  }

  // Find max PnL to scale horizontal bars
  const maxAbsPnl = Math.max(
    ...data.underwriters.map((uw) => Math.abs(uw.totalPnl)),
    1 // prevent division by zero
  );

  const [selectedUw, setSelectedUw] = useState<UnderwriterStats | null>(null);

  return (
    <Dialog modal={true} open={!!selectedUw} onOpenChange={(open) => !open && setSelectedUw(null)}>
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-opacity duration-300",
        loading && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Building2 className="size-3.5 text-amber-500" /> Underwriter Matrix
        </h2>
        {timeframeLabel && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
            {timeframeLabel}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {data.underwriters.map((uw, idx) => {
          const isWinner = uw.totalPnl >= 0;
          const barWidth = Math.max((Math.abs(uw.totalPnl) / maxAbsPnl) * 100, 2); // min 2% width for visibility

          return (
            <div 
              key={uw.name + idx} 
              className="flex flex-col gap-1.5 group cursor-pointer"
              onClick={() => setSelectedUw(uw)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-sans line-clamp-1 max-w-[120px] sm:max-w-[200px] group-hover:underline">
                    {uw.name}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 bg-muted rounded group-hover:bg-amber-500/20 group-hover:text-amber-500 transition-colors">
                    {uw.totalTrades} Trade{uw.totalTrades !== 1 ? "s" : ""}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-xs font-bold font-mono",
                    isWinner ? "text-profit" : "text-loss"
                  )}
                >
                  {isWinner ? "+" : ""}
                  {formatIDR(uw.totalPnl)}
                </span>
              </div>

              {/* Stats row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 text-[10px] text-muted-foreground font-mono">
                <div className="flex items-center gap-4">
                  <span>Hit Rate: <span className="font-bold text-foreground">{uw.hitRate.toFixed(0)}%</span></span>
                  <span>Avg Allot: <span className="font-bold text-foreground">{uw.avgAllotmentRate.toFixed(1)}%</span></span>
                </div>
              </div>

              {/* Horizontal Bar */}
              <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden mt-0.5">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isWinner ? "bg-profit" : "bg-loss"
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      </div>

      {/* Drill-Down Modal */}
      <DialogContent className="max-w-md p-4">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2 border-b border-border/50 pb-3 mb-1">
            <Building2 className="size-4 text-amber-500" /> 
            {selectedUw?.name} 
            <span className="text-xs text-muted-foreground font-normal ml-auto">
              History
            </span>
          </DialogTitle>
        </DialogHeader>

        {selectedUw && (
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {selectedUw.trades.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold font-mono text-sm leading-none">{t.ticker}</p>
                    <span 
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.25 rounded",
                        t.role === "Sole UW" 
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                          : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      )}
                    >
                      {t.role}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase">
                    {new Date(t.sellDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className={cn("text-xs font-bold font-mono leading-none", t.pnl >= 0 ? "text-profit" : "text-loss")}>
                    {t.pnl >= 0 ? "+" : ""}{formatIDR(t.pnl)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                    Allot: {t.allotmentRate}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
