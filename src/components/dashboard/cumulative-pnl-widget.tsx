"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { formatIDR } from "@/lib/twr";
import { cn } from "@/lib/utils";
import type { AdvancedAnalytics } from "@/lib/analytics-data";

interface CumulativePnLWidgetProps {
  data: AdvancedAnalytics | null;
  loading?: boolean;
  timeframeLabel?: string;
}

export function CumulativePnLWidget({
  data,
  loading,
  timeframeLabel,
}: CumulativePnLWidgetProps) {
  if (!data || data.cumulativePnl.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="size-3.5 text-primary" /> Cumulative Realized
          PnL
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-muted/50 p-3 rounded-full mb-3">
            <TrendingUp className="size-6 text-muted-foreground opacity-50" />
          </div>
          <p className="text-xs font-bold text-foreground mb-1">
            No Trades in Period
          </p>
          <p className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
            Your cumulative profit curve will appear here once there are closed trades in this timeframe.
          </p>
        </div>
      </div>
    );
  }

  // Format dates for display
  const chartData = data.cumulativePnl.map((point) => ({
    ...point,
    displayDate: format(new Date(point.date), "dd MMM yy"),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const isPositive = d.cumulativePnl >= 0;
      const tradeIsPositive = d.realizedPnl >= 0;

      return (
        <div className="bg-card/95 backdrop-blur border border-border rounded-lg shadow-md p-3">
          <p className="text-sm font-bold font-mono mb-2">{d.displayDate}</p>

          <div className="flex items-center justify-between gap-4 text-xs font-mono my-1">
            <span className="text-muted-foreground font-sans text-[10px] uppercase tracking-wider font-medium">
              Trade ({d.ticker})
            </span>
            <span
              className={cn(
                "font-bold",
                tradeIsPositive ? "text-profit" : "text-loss"
              )}
            >
              {tradeIsPositive ? "+" : ""}
              {formatIDR(d.realizedPnl)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 text-xs font-mono my-1 pt-1 border-t border-border/50">
            <span className="text-foreground font-sans text-[10px] uppercase tracking-wider font-bold">
              Total Realized
            </span>
            <span
              className={cn(
                "font-bold",
                isPositive ? "text-profit" : "text-loss"
              )}
            >
              {isPositive ? "+" : ""}
              {formatIDR(d.cumulativePnl)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const finalPnL =
    data.cumulativePnl[data.cumulativePnl.length - 1].cumulativePnl;
  const pnlColor = finalPnL >= 0 ? "text-profit" : "text-loss";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm transition-opacity duration-300",
        loading && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex items-start justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-primary" /> Cumulative Realized PnL
          </div>
          {timeframeLabel && <span className="font-normal opacity-70">{timeframeLabel}</span>}
        </h2>
        {timeframeLabel && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
            {timeframeLabel}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className={cn("text-2xl font-bold font-mono tracking-tight", pnlColor)}>
          {finalPnL >= 0 ? "+" : ""}
          {formatIDR(finalPnL)}
        </span>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
          Total All-Time
        </p>
      </div>

      <div className="h-[250px] w-full mt-2 -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCumulativePnL" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              dataKey="displayDate"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 600,
              }}
              dy={10}
              minTickGap={30}
            />
            <YAxis
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
              cursor={{
                stroke: "hsl(var(--primary))",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Area
              type="stepAfter"
              dataKey="cumulativePnl"
              name="Cumulative PnL"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorCumulativePnL)"
              dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
