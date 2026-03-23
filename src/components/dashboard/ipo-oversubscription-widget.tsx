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
import { AlertTriangle } from "lucide-react";
import { formatIDR } from "@/lib/twr";
import { cn } from "@/lib/utils";
import type { IpoAnalytics } from "@/lib/analytics-data";

const WINNER_COLOR = "#10B981";
const LOSER_COLOR = "#EF4444";

interface IpoOversubscriptionWidgetProps {
  data: IpoAnalytics | null;
  loading?: boolean;
  timeframeLabel?: string;
}

export function IpoOversubscriptionWidget({
  data,
  loading,
  timeframeLabel,
}: IpoOversubscriptionWidgetProps) {
  if (!data || data.scatterData.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-amber-500" /> The Oversubscription Trap
          </div>
          {timeframeLabel && <span className="font-normal opacity-70">{timeframeLabel}</span>}
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-amber-500/10 p-3 rounded-full mb-3">
            <AlertTriangle className="size-6 text-amber-500 opacity-50" />
          </div>
          <p className="text-xs font-bold text-foreground mb-1">No IPO Data</p>
          <p className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
            Complete IPO trades to visualize the allotment-to-return relationship.
          </p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const isPositive = d.roi >= 0;

      return (
        <div className="bg-card/95 backdrop-blur border border-border rounded-lg shadow-md p-3 min-w-[160px]">
          <p className="text-sm font-bold font-mono mb-2">{d.ticker}</p>

          <div className="flex items-center justify-between gap-4 text-xs font-mono my-1">
            <span className="text-muted-foreground font-sans text-[10px] uppercase tracking-wider font-medium">
              Allotment
            </span>
            <span className="font-bold text-amber-500">{d.allotmentRate}%</span>
          </div>

          <div className="flex items-center justify-between gap-4 text-xs font-mono my-1">
            <span className="text-muted-foreground font-sans text-[10px] uppercase tracking-wider font-medium">
              ROI
            </span>
            <span
              className={cn(
                "font-bold",
                isPositive ? "text-profit" : "text-loss"
              )}
            >
              {isPositive ? "+" : ""}{d.roi}%
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 text-xs font-mono my-1 pt-1 border-t border-border/50">
            <span className="text-muted-foreground font-sans text-[10px] uppercase tracking-wider font-medium">
              PnL
            </span>
            <span
              className={cn(
                "font-bold",
                d.pnl >= 0 ? "text-profit" : "text-loss"
              )}
            >
              {d.pnl >= 0 ? "+" : ""}{formatIDR(d.pnl)}
            </span>
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
          <AlertTriangle className="size-3.5 text-amber-500" /> Oversubscription Trap
        </h2>
        {timeframeLabel && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
            {timeframeLabel}
          </span>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground px-1">
        Do high allotments guarantee losses? <span className="text-amber-500 font-semibold">Green</span> = profit, <span className="text-loss font-semibold">Red</span> = loss.
      </p>

      <div className="h-[280px] w-full mt-2 -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, left: 10, bottom: 40 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              type="number"
              dataKey="allotmentRate"
              name="Allotment Rate"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 600,
              }}
              tickFormatter={(v) => `${v}%`}
              label={{
                value: "Allotment Rate (%)",
                position: "insideBottom",
                offset: -20,
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 700,
              }}
            />
            <YAxis
              type="number"
              dataKey="roi"
              name="ROI"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 600,
              }}
              tickFormatter={(v) => `${v}%`}
              width={55}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--border))" }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
            <Scatter name="IPOs" data={data.scatterData}>
              {data.scatterData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.pnl >= 0 ? WINNER_COLOR : LOSER_COLOR}
                  r={6}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
