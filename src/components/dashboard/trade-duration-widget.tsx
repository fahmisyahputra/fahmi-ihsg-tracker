"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Clock } from "lucide-react";
import { formatIDR } from "@/lib/twr";
import { cn } from "@/lib/utils";
import type { AdvancedAnalytics } from "@/lib/analytics-data";

interface TradeDurationWidgetProps {
  data: AdvancedAnalytics | null;
  loading?: boolean;
  timeframeLabel?: string;
}

const WINNER_COLOR = "#10B981"; // text-profit
const LOSER_COLOR = "#EF4444"; // text-loss

export function TradeDurationWidget({ data, loading, timeframeLabel }: TradeDurationWidgetProps) {
  if (!data || data.tradeDuration.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-primary" /> Trade Duration vs PnL
          </div>
          {timeframeLabel && <span className="font-normal opacity-70">{timeframeLabel}</span>}
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-muted/50 p-3 rounded-full mb-3">
            <Clock className="size-6 text-muted-foreground opacity-50" />
          </div>
          <p className="text-xs font-bold text-foreground mb-1">
            No Duration Data
          </p>
          <p className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
            Close trades to see how your holding periods correlate with
            profitability.
          </p>
        </div>
      </div>
    );
  }

  const chartData = [...data.tradeDuration].sort((a, b) => a.holdingDays - b.holdingDays);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const isPositive = d.pnl >= 0;

      return (
        <div className="bg-card/95 backdrop-blur border border-border rounded-lg shadow-md p-3 min-w-[150px]">
          <p className="text-sm font-bold font-mono mb-2">{d.ticker}</p>

          <div className="flex items-center justify-between gap-4 text-xs font-mono my-1">
            <span className="text-muted-foreground font-sans text-[10px] uppercase tracking-wider font-medium">
              PnL
            </span>
            <span
              className={cn(
                "font-bold",
                isPositive ? "text-profit" : "text-loss"
              )}
            >
              {isPositive ? "+" : ""}
              {formatIDR(d.pnl)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 text-xs font-mono my-1">
            <span className="text-muted-foreground font-sans text-[10px] uppercase tracking-wider font-medium">
              Duration
            </span>
            <span className="font-bold">{d.holdingDays} day{d.holdingDays !== 1 ? 's' : ''}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm transition-opacity duration-300",
        loading && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex items-start justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Clock className="size-3.5 text-primary" /> Trade Duration vs PnL
        </h2>
        {timeframeLabel && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
            {timeframeLabel}
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 mt-1 mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: WINNER_COLOR }}
          />
          <span className="text-[10px] font-medium text-muted-foreground">
            Profitable
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: LOSER_COLOR }}
          />
          <span className="text-[10px] font-medium text-muted-foreground">
            Losing
          </span>
        </div>
      </div>

      <div className="h-[250px] w-full mt-2 -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              type="number"
              dataKey="holdingDays"
              name="Days Held"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 600,
              }}
              tickFormatter={(v) => `${v}d`}
            />
            <YAxis
              type="number"
              dataKey="pnl"
              name="Realized PnL"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 600,
              }}
              tickFormatter={(v) => {
                if (Math.abs(v) >= 1_000_000)
                  return `${(v / 1_000_000).toFixed(1)}M`;
                if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                return v.toString();
              }}
              width={60}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--border))" }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
            <Scatter name="Trades" data={chartData}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.pnl >= 0 ? WINNER_COLOR : LOSER_COLOR}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
