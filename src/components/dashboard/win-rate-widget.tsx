"use client";

import { Target, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { formatIDR } from "@/lib/twr";
import { cn } from "@/lib/utils";
import type { AdvancedAnalytics } from "@/lib/analytics-data";

interface WinRateWidgetProps {
  data: AdvancedAnalytics | null;
  loading?: boolean;
  timeframeLabel?: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
  colorClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex items-center justify-center size-7 rounded-lg",
            colorClass === "text-profit"
              ? "bg-profit/10"
              : colorClass === "text-loss"
              ? "bg-loss/10"
              : "bg-primary/10"
          )}
        >
          <Icon className={cn("size-3.5", colorClass || "text-primary")} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <p className={cn("text-xl font-bold font-mono tracking-tight", colorClass)}>
        {value}
      </p>
      {subtext && (
        <p className="text-[10px] text-muted-foreground font-medium">{subtext}</p>
      )}
    </div>
  );
}

export function WinRateWidget({ data, loading, timeframeLabel }: WinRateWidgetProps) {
  if (!data || data.totalTrades === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <Target className="size-3.5 text-primary" /> Win Rate & Risk/Reward
          </div>
          {timeframeLabel && <span className="font-normal opacity-70">{timeframeLabel}</span>}
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-muted/50 p-3 rounded-full mb-3">
            <Target className="size-6 text-muted-foreground opacity-50" />
          </div>
          <p className="text-xs font-bold text-foreground mb-1">No Trades in Period</p>
          <p className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
            There are no closed positions in this timeframe. Adjust the dates above to see your statistics.
          </p>
        </div>
      </div>
    );
  }

  const winRateColor =
    data.winRate >= 60 ? "text-profit" : data.winRate >= 40 ? "text-foreground" : "text-loss";

  const rrColor =
    data.riskRewardRatio >= 2
      ? "text-profit"
      : data.riskRewardRatio >= 1
      ? "text-foreground"
      : "text-loss";

  // SVG circular progress for win rate
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const progress = (data.winRate / 100) * circumference;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-opacity duration-300",
        loading && "opacity-50 pointer-events-none"
      )}
    >
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <Target className="size-3.5 text-primary" /> Win Rate & Risk/Reward
        </div>
        {timeframeLabel && <span className="font-normal opacity-70">{timeframeLabel}</span>}
      </h2>

      {/* Win Rate Ring + Stats Grid */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Circular Win Rate */}
        <div className="relative flex-shrink-0">
          <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="6"
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke={data.winRate >= 50 ? "#10B981" : "#EF4444"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-lg font-bold font-mono", winRateColor)}>
              {data.winRate.toFixed(1)}%
            </span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
              Win Rate
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 flex-1 w-full">
          <StatCard
            icon={TrendingUp}
            label="Avg Win"
            value={`+${formatIDR(data.avgWin)}`}
            subtext={`${data.winningTrades} winning trade${data.winningTrades !== 1 ? "s" : ""}`}
            colorClass="text-profit"
          />
          <StatCard
            icon={TrendingDown}
            label="Avg Loss"
            value={formatIDR(data.avgLoss)}
            subtext={`${data.losingTrades} losing trade${data.losingTrades !== 1 ? "s" : ""}`}
            colorClass="text-loss"
          />
          <StatCard
            icon={Scale}
            label="Risk/Reward"
            value={
              data.riskRewardRatio === Infinity
                ? "∞"
                : `${data.riskRewardRatio.toFixed(2)}x`
            }
            subtext={
              data.riskRewardRatio >= 2
                ? "Excellent"
                : data.riskRewardRatio >= 1
                ? "Acceptable"
                : "Needs improvement"
            }
            colorClass={rrColor}
          />
          <StatCard
            icon={Target}
            label="Total Trades"
            value={data.totalTrades.toString()}
            subtext="Closed positions"
          />
        </div>
      </div>
    </div>
  );
}
