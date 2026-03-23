"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Trophy, AlertTriangle } from "lucide-react";
import { formatIDR } from "@/lib/twr";
import { cn } from "@/lib/utils";
import type { AdvancedAnalytics, TickerPnL } from "@/lib/analytics-data";

interface TopTickersWidgetProps {
  data: AdvancedAnalytics | null;
  loading?: boolean;
  timeframeLabel?: string;
}

const WINNER_COLOR = "#10B981";
const LOSER_COLOR = "#EF4444";

export function TopTickersWidget({ data, loading, timeframeLabel }: TopTickersWidgetProps) {
  if (
    !data ||
    (data.topWinners.length === 0 && data.topLosers.length === 0)
  ) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="size-3.5 text-primary" /> Top Winners & Losers
          </div>
          {timeframeLabel && <span className="font-normal opacity-70">{timeframeLabel}</span>}
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-muted/50 p-3 rounded-full mb-3">
            <Trophy className="size-6 text-muted-foreground opacity-50" />
          </div>
          <p className="text-xs font-bold text-foreground mb-1">
            No Trades in Period
          </p>
          <p className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
            There are no closed positions in this timeframe. Adjust the dates above to see your top performers.
          </p>
        </div>
      </div>
    );
  }

  // Combine winners and losers into a single sorted dataset for the chart
  const chartData = [
    ...data.topWinners.map((t: TickerPnL) => ({
      ticker: t.ticker,
      pnl: t.totalPnl,
      trades: t.tradeCount,
    })),
    ...data.topLosers
      .slice()
      .reverse()
      .map((t: TickerPnL) => ({
        ticker: t.ticker,
        pnl: t.totalPnl,
        trades: t.tradeCount,
      })),
  ].sort((a, b) => b.pnl - a.pnl);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const isPositive = d.pnl >= 0;
      return (
        <div className="bg-card/95 backdrop-blur border border-border rounded-lg shadow-md p-3">
          <p className="text-sm font-bold font-mono mb-1">{d.ticker}</p>
          <div className="flex items-center justify-between gap-4 text-xs font-mono my-0.5">
            <span className="text-muted-foreground font-sans text-[10px] uppercase tracking-wider font-medium">
              Total PnL
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
          <div className="flex items-center justify-between gap-4 text-xs font-mono my-0.5">
            <span className="text-muted-foreground font-sans text-[10px] uppercase tracking-wider font-medium">
              Trades
            </span>
            <span className="font-bold">{d.trades}</span>
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
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <Trophy className="size-3.5 text-primary" /> Top Winners & Losers
        </div>
        {timeframeLabel && <span className="font-normal opacity-70">{timeframeLabel}</span>}
      </h2>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: WINNER_COLOR }}
          />
          <span className="text-[10px] font-medium text-muted-foreground">
            Winners
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: LOSER_COLOR }}
          />
          <span className="text-[10px] font-medium text-muted-foreground">
            Losers
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px] w-full -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 9,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 600,
              }}
              tickFormatter={(v) => {
                if (Math.abs(v) >= 1_000_000)
                  return `${(v / 1_000_000).toFixed(1)}M`;
                if (Math.abs(v) >= 1_000)
                  return `${(v / 1_000).toFixed(0)}K`;
                return v.toString();
              }}
            />
            <YAxis
              type="category"
              dataKey="ticker"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 11,
                fill: "hsl(var(--foreground))",
                fontWeight: 700,
                fontFamily: "var(--font-mono, monospace)",
              }}
              width={55}
            />
            <ReferenceLine
              x={0}
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
            />
            <Bar dataKey="pnl" radius={[0, 4, 4, 0]} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.pnl >= 0 ? WINNER_COLOR : LOSER_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary badges */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="flex items-center gap-2 bg-profit/5 border border-profit/10 rounded-lg p-2.5">
          <Trophy className="size-4 text-profit" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-profit/70">
              Best Performer
            </p>
            <p className="text-sm font-bold font-mono text-profit">
              {data.topWinners[0]?.ticker || "—"}
              <span className="text-[10px] font-normal ml-1">
                {data.topWinners[0]
                  ? `+${formatIDR(data.topWinners[0].totalPnl)}`
                  : ""}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-loss/5 border border-loss/10 rounded-lg p-2.5">
          <AlertTriangle className="size-4 text-loss" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-loss/70">
              Worst Performer
            </p>
            <p className="text-sm font-bold font-mono text-loss">
              {data.topLosers[0]?.ticker || "—"}
              <span className="text-[10px] font-normal ml-1">
                {data.topLosers[0]
                  ? formatIDR(data.topLosers[0].totalPnl)
                  : ""}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
