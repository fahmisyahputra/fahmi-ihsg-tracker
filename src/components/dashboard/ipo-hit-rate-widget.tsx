"use client";

import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IpoAnalytics } from "@/lib/analytics-data";

interface IpoHitRateWidgetProps {
  data: IpoAnalytics | null;
  loading?: boolean;
  timeframeLabel?: string;
}

export function IpoHitRateWidget({
  data,
  loading,
  timeframeLabel,
}: IpoHitRateWidgetProps) {
  if (!data || data.totalIpos === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <Target className="size-3.5 text-amber-500" /> IPO Hit Rate
          </div>
          {timeframeLabel && <span className="font-normal opacity-70">{timeframeLabel}</span>}
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-amber-500/10 p-3 rounded-full mb-3">
            <Target className="size-6 text-amber-500 opacity-50" />
          </div>
          <p className="text-xs font-bold text-foreground mb-1">No IPO Data</p>
          <p className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
            Complete and sell an IPO allotment to see your hit rate.
          </p>
        </div>
      </div>
    );
  }

  const hitRate = data.hitRate;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (hitRate / 100) * circumference;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-opacity duration-300",
        loading && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex items-start justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Target className="size-3.5 text-amber-500" /> IPO Hit Rate
        </h2>
        {timeframeLabel && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
            {timeframeLabel}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-8">
        {/* Circular Progress */}
        <div className="relative flex items-center justify-center">
          <svg width="120" height="120" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            {/* Progress Circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={hitRate >= 70 ? "#10B981" : hitRate >= 40 ? "#F59E0B" : "#EF4444"}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-mono tracking-tight">
              {hitRate.toFixed(0)}%
            </span>
            <span className="text-[9px] text-muted-foreground font-bold uppercase">Hit Rate</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total IPOs</p>
            <p className="text-xl font-bold font-mono">{data.totalIpos}</p>
          </div>
          <div>
            <p className="text-[10px] text-profit font-bold uppercase tracking-wider">Profitable</p>
            <p className="text-xl font-bold font-mono text-profit">{data.profitableIpos}</p>
          </div>
          <div>
            <p className="text-[10px] text-loss font-bold uppercase tracking-wider">Losing</p>
            <p className="text-xl font-bold font-mono text-loss">{data.totalIpos - data.profitableIpos}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
