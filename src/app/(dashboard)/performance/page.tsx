"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { 
  BarChart3, 
  TrendingUp, 
  Filter, 
  Calendar as CalendarIcon, 
  Search, 
  ArrowUpDown, 
  Clock,
  Loader2
} from "lucide-react";
import { format, subDays } from "date-fns";
import { DateRange } from "react-day-picker";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatIDR } from "@/lib/twr";
import { cn } from "@/lib/utils";
import { fetchPerformanceData } from "@/app/actions/performance";
import type { PerformanceStats } from "@/lib/performance-data";

// Reusable Date Range Picker Component
function DatePickerWithRange({
  className,
  date,
  setDate,
}: {
  className?: string;
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger
          id="date"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full justify-start text-left font-normal border-border bg-card",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "LLL dd, y")} -{" "}
                {format(date.to, "LLL dd, y")}
              </>
            ) : (
              format(date.from, "LLL dd, y")
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Reusable Dashboard Core Content
function AnalyticsDashboard({ 
  type, 
  metrics, 
  chartData,
  loading
}: { 
  type: string; 
  metrics: { totalEquity: number; nominalGrowth: number; percentGrowth: number; xirr: number }; 
  chartData: any[];
  loading?: boolean;
}) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur border border-border rounded-lg shadow-md p-3">
          <p className="text-sm font-bold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const isNegative = entry.value < 0;
            return (
              <div key={index} className="flex items-center justify-between gap-4 text-xs font-mono my-1">
                <div className="flex items-center gap-1.5 font-sans font-medium text-muted-foreground uppercase tracking-wider text-[10px]">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}
                </div>
                <span className={cn("font-bold", isNegative ? "text-loss" : "text-foreground")}>
                  {formatIDR(entry.value)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("space-y-6 transition-opacity duration-300", loading && "opacity-50 pointer-events-none")}>
      {/* Hero Metrics */}
      <div className="flex flex-col gap-1 px-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {type === "all" ? "Total Return" : `${type.toUpperCase()} Return`}
        </p>
        <h2 className="text-3xl font-bold font-mono tracking-tight text-foreground">
          {formatIDR(metrics.totalEquity)}
        </h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-bold font-mono px-2 py-0.5 rounded-full",
              metrics.nominalGrowth >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
            )}>
              {metrics.nominalGrowth >= 0 ? "+" : ""}{formatIDR(metrics.nominalGrowth)}
            </span>
            <span className={cn(
              "text-sm font-bold font-mono",
              metrics.percentGrowth >= 0 ? "text-profit" : "text-loss"
            )}>
              ({metrics.percentGrowth >= 0 ? "+" : ""}{metrics.percentGrowth}%)
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">TWR</span>
          </div>

          <div className="h-3 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-bold font-mono",
              metrics.xirr >= 0 ? "text-profit" : "text-loss"
            )}>
              {metrics.xirr >= 0 ? "+" : ""}{metrics.xirr}%
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">MWR (XIRR)</span>
          </div>
        </div>
      </div>

      {/* Equity Growth Curve */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="size-3.5 text-primary" /> Equity Growth Curve
        </h2>
        <div className="h-[250px] w-full mt-4 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }}
                dy={10}
                minTickGap={20}
              />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="simulatedEquity"
                name="Total Equity"
                stroke="#10B981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorEquity)"
                dot={{ r: 3, fill: "#10B981", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Return Matrix */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm relative overflow-hidden">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <BarChart3 className="size-3.5 text-primary" /> Monthly Return Matrix
        </h2>
        
        {/* Empty State Overlay */}
        {chartData.every(d => d.realizedPnL === 0 && d.ipoPnL === 0 && d.dividendYield === 0) && (
          <div className="absolute inset-0 z-10 bg-card/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-muted/50 p-3 rounded-full mb-3">
              <BarChart3 className="size-6 text-muted-foreground opacity-50" />
            </div>
            <p className="text-xs font-bold text-foreground mb-1">No Activity Detected</p>
            <p className="text-[10px] text-muted-foreground max-w-[200px] leading-relaxed">
              Realized gains, IPO flips, and dividends will appear here once you close a position.
            </p>
          </div>
        )}

        <div className="h-[250px] w-full mt-4 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }}
                dy={10}
                minTickGap={20}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }} />
              {type === "all" || type === "stocks" ? (
                <Bar dataKey="realizedPnL" name="Stocks" fill="#3B82F6" radius={[2, 2, 0, 0]} stackId="stack" />
              ) : null}
              {type === "all" || type === "ipo" ? (
                <Bar dataKey="ipoPnL" name="IPO" fill="#F59E0B" radius={[0, 0, 0, 0]} stackId="stack" />
              ) : null}
              {type === "all" || type === "dividends" ? (
                <Bar dataKey="dividendYield" name="Dividends" fill="#10B981" radius={[2, 2, 0, 0]} stackId="stack" />
              ) : null}
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    return [
      { label: `This Year (${currentYear})`, value: currentYear.toString() },
      { label: (currentYear - 1).toString(), value: (currentYear - 1).toString() },
      { label: (currentYear - 2).toString(), value: (currentYear - 2).toString() },
      { label: "Custom Date Range", value: "custom" },
    ];
  }, [currentYear]);

  const [activeTab, setActiveTab] = useState("all");
  const [year, setYear] = useState(currentYear.toString());
  const [range, setRange] = useState("6M");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("pnl-desc");
  const [tableRange, setTableRange] = useState("YTD");

  // Date Range States
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [tableDateRange, setTableDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Real Data State
  const [perfData, setPerfData] = useState<PerformanceStats | null>(null);
  const [tableData, setTableData] = useState<{ ticker: string; pnl: number; pnlPercent: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  // Fetch Main Performance Data
  const loadMainData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPerformanceData({
        year,
        range,
        customRange: year === "custom" ? dateRange : undefined
      });
      setPerfData(data);
    } catch (error) {
      console.error("Failed to load performance data:", error);
    } finally {
      setLoading(false);
    }
  }, [year, range, dateRange]);

  // Fetch Table Data (if different from main range)
  const loadTableData = useCallback(async () => {
    setTableLoading(true);
    try {
      const data = await fetchPerformanceData({
        year: tableRange === "custom" ? "custom" : "this_year",
        range: tableRange,
        customRange: tableRange === "custom" ? tableDateRange : undefined
      });
      setTableData(data.topMovers);
    } catch (error) {
      console.error("Failed to load table data:", error);
    } finally {
      setTableLoading(false);
    }
  }, [tableRange, tableDateRange]);

  useEffect(() => {
    loadMainData();
  }, [loadMainData]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  const sortedMovers = useMemo(() => {
    return tableData
      .filter((m) => m.ticker.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "pnl-desc") return b.pnl - a.pnl;
        if (sortBy === "pnl-asc") return a.pnl - b.pnl;
        if (sortBy === "percent-desc") return b.pnlPercent - a.pnlPercent;
        if (sortBy === "percent-asc") return a.pnlPercent - b.pnlPercent;
        return 0;
      });
  }, [tableData, search, sortBy]);

  if (!perfData && loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="size-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">Analyzing your portfolio...</p>
      </div>
    );
  }

  const currentMetrics = perfData || { totalEquity: 0, nominalGrowth: 0, percentGrowth: 0, xirr: 0 };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 overflow-x-hidden">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1">
            <BarChart3 className="size-5 text-primary" /> Performance
          </h1>
          <p className="text-xs text-muted-foreground">Historical portfolio analytics.</p>
        </div>
      </div>

      {/* Main Filters Row */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
          <Select value={year} onValueChange={(v) => v && setYear(v)}>
            <SelectTrigger className="w-auto min-w-[150px] h-8 text-[11px] font-semibold bg-card border-border rounded-lg px-3">
              <CalendarIcon className="size-3 mr-1.5 text-muted-foreground" />
              <SelectValue>
                {yearOptions.find(o => o.value === year)?.label || "Year"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={range} onValueChange={setRange} className="w-auto">
            <TabsList className="bg-muted/50 border border-border h-8 p-1">
              {["1W", "1M", "3M", "6M", "YTD", "ALL"].map((r) => (
                <TabsTrigger 
                  key={r} 
                  value={r}
                  className="h-6 px-3 text-[10px] font-bold rounded-md data-[state=active]:bg-background data-[state=active]:text-primary"
                >
                  {r}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {year === "custom" && (
          <div className="px-1 animate-in slide-in-from-top-2 duration-300">
             <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>
        )}
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          <Filter className="size-4 text-muted-foreground shrink-0" />
          <TabsList className="bg-muted/30 border border-border h-9">
            {["all", "stocks", "ipo", "dividends"].map(t => (
              <TabsTrigger key={t} value={t} className="text-xs capitalize rounded-md px-4">
                {t === "all" ? "All-In" : t}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          <AnalyticsDashboard 
            type={activeTab} 
            metrics={currentMetrics} 
            chartData={perfData?.monthlyData || []} 
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {/* Top Movers Section */}
      <div className="flex flex-col gap-4 mt-4 relative">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Top Movers (Positions)</h2>
            <Select value={tableRange} onValueChange={(v) => v && setTableRange(v)}>
               <SelectTrigger className="w-auto h-7 text-[10px] font-bold border-none bg-muted/30 px-2 rounded-md ring-0 outline-none">
                  <Clock className="size-3 mr-1 text-muted-foreground" />
                  <SelectValue />
               </SelectTrigger>
               <SelectContent>
                  {["1W", "1M", "3M", "6M", "YTD", "ALL", "custom"].map(r => (
                    <SelectItem key={r} value={r} className="text-[10px] capitalize">
                      {r === "custom" ? "Custom Range" : r}
                    </SelectItem>
                  ))}
               </SelectContent>
            </Select>
          </div>

          {tableRange === "custom" && (
            <div className="animate-in slide-in-from-top-1 duration-200">
               <DatePickerWithRange date={tableDateRange} setDate={setTableDateRange} />
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search Ticker..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs border-border bg-card shadow-sm"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
              <SelectTrigger className="w-full h-9 text-[10px] font-bold border-border bg-card px-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="size-3 text-muted-foreground" />
                  <SelectValue>
                    {[
                      { label: "Top Gainer (Rp)", value: "pnl-desc" },
                      { label: "Top Loser (Rp)", value: "pnl-asc" },
                      { label: "Top Gainer (%)", value: "percent-desc" },
                      { label: "Top Loser (%)", value: "percent-asc" },
                    ].find((o) => o.value === sortBy)?.label || "Sort Results"}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent>
                {[
                  { label: "Top Gainer (Rp)", value: "pnl-desc" },
                  { label: "Top Loser (Rp)", value: "pnl-asc" },
                  { label: "Top Gainer (%)", value: "percent-desc" },
                  { label: "Top Loser (%)", value: "percent-asc" },
                ].map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={cn(
          "rounded-xl border border-border bg-card overflow-hidden overflow-x-auto shadow-sm transition-opacity duration-300",
          tableLoading && "opacity-50 pointer-events-none"
        )}>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest px-3">Ticker</TableHead>
                <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest text-right px-3">PnL (Rp)</TableHead>
                <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest text-right px-3">Return</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMovers.length > 0 ? (
                sortedMovers.map((mover) => (
                  <TableRow key={mover.ticker} className="border-border hover:bg-muted/30">
                    <TableCell className="py-3 px-3 font-mono font-bold text-sm">{mover.ticker}</TableCell>
                    <TableCell className={cn(
                      "py-3 px-3 text-right font-mono text-sm leading-none tracking-tight",
                      mover.pnl >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {mover.pnl >= 0 ? "+" : ""}{formatIDR(mover.pnl)}
                    </TableCell>
                    <TableCell className={cn(
                      "py-3 px-3 text-right font-mono text-sm leading-none tracking-tight",
                      mover.pnlPercent >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {mover.pnlPercent >= 0 ? "+" : ""}{mover.pnlPercent.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                   <TableCell colSpan={3} className="h-24 text-center text-xs text-muted-foreground italic">
                      No trades recorded for this period.
                   </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
