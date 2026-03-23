"use client";

import { Percent, DollarSign, PieChart } from "lucide-react";
import { formatIDR } from "@/lib/twr";
import { cn } from "@/lib/utils";
import type { IpoAnalytics } from "@/lib/analytics-data";

interface IpoEfficiencyWidgetProps {
  data: IpoAnalytics | null;
  loading?: boolean;
  timeframeLabel?: string;
}

export function IpoEfficiencyWidget({
  data,
  loading,
  timeframeLabel,
}: IpoEfficiencyWidgetProps) {
  if (!data || data.totalIpos === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <PieChart className="size-3.5 text-amber-500" /> Capital & Allotment Efficiency
          </div>
          {timeframeLabel && <span className="font-normal opacity-70">{timeframeLabel}</span>}
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-amber-500/10 p-3 rounded-full mb-3">
            <PieChart className="size-6 text-amber-500 opacity-50" />
          </div>
          <p className="text-xs font-bold text-foreground mb-1">No IPO Data</p>
          <p className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
            Complete and sell an IPO allotment to see your capital efficiency metrics.
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Avg Allotment",
      value: `${data.avgAllotmentRate.toFixed(1)}%`,
      icon: Percent,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Locked Capital ROI",
      value: `${data.lockedCapitalRoi >= 0 ? "+" : ""}${data.lockedCapitalRoi.toFixed(1)}%`,
      icon: DollarSign,
      color: data.lockedCapitalRoi >= 0 ? "text-profit" : "text-loss",
      bgColor: data.lockedCapitalRoi >= 0 ? "bg-profit/10" : "bg-loss/10",
    },
    {
      label: "Allotted Capital ROI",
      value: `${data.allottedCapitalRoi >= 0 ? "+" : ""}${data.allottedCapitalRoi.toFixed(1)}%`,
      icon: DollarSign,
      color: data.allottedCapitalRoi >= 0 ? "text-profit" : "text-loss",
      bgColor: data.allottedCapitalRoi >= 0 ? "bg-profit/10" : "bg-loss/10",
    },
  ];

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-opacity duration-300",
        loading && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex items-start justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <PieChart className="size-3.5 text-amber-500" /> Capital & Allotment Efficiency
        </h2>
        {timeframeLabel && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
            {timeframeLabel}
          </span>
        )}
      </div>

      {/* Summary Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-1 bg-muted/20 sm:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none border border-border/50 sm:border-none">
        <div className="flex-1 flex items-center justify-between sm:block border-b border-border/50 sm:border-none pb-2 sm:pb-0">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Locked Capital</p>
          <p className="text-xs sm:text-sm font-bold font-mono">{formatIDR(data.totalLockedCapital)}</p>
        </div>
        <div className="hidden sm:block h-8 w-px bg-border" />
        <div className="flex-1 flex items-center justify-between sm:block border-b border-border/50 sm:border-none pb-2 sm:pb-0">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Allotted Value</p>
          <p className="text-xs sm:text-sm font-bold font-mono">{formatIDR(data.totalAllottedValue)}</p>
        </div>
        <div className="hidden sm:block h-8 w-px bg-border" />
        <div className="flex-1 flex items-center justify-between sm:block">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Realized PnL</p>
          <p className={cn("text-xs sm:text-sm font-bold font-mono", data.totalRealizedPnl >= 0 ? "text-profit" : "text-loss")}>
            {data.totalRealizedPnl >= 0 ? "+" : ""}{formatIDR(data.totalRealizedPnl)}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-2 sm:gap-1.5 rounded-lg border border-border/50 bg-muted/30 p-3"
          >
            <div className="flex items-center gap-2 sm:flex-col sm:gap-1.5">
              <div className={cn("p-1.5 rounded-md", stat.bgColor)}>
                <stat.icon className={cn("size-3.5", stat.color)} />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-tight">
                {stat.label}
              </span>
            </div>
            <span className={cn("text-base sm:text-lg font-bold font-mono tracking-tight", stat.color)}>
              {stat.value}
            </span>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider text-center leading-tight">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
