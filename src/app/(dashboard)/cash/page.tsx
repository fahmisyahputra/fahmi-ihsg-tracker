"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  ArrowLeft, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar as CalendarIcon,
  Loader2,
  TrendingUp,
  TrendingDown,
  Coins,
  History,
  Search
} from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import Link from "next/link";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { fetchCashMutations } from "@/app/actions/cash";
import type { CashMutation, CashStats } from "@/app/actions/cash";

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
            "w-full justify-start text-left font-normal border-border bg-card shadow-sm",
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

export default function CashHistoryPage() {
  const [range, setRange] = useState("YTD");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [data, setData] = useState<CashStats | null>(null);
  const [loading, setLoading] = useState(true);

  // New Interaction State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "AMOUNT_DESC" | "AMOUNT_ASC">("NEWEST");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchCashMutations({
        range,
        customRange: range === "custom" ? dateRange : undefined
      });
      setData(result);
    } catch (error) {
      console.error("Failed to load cash mutations:", error);
    } finally {
      setLoading(false);
    }
  }, [range, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getDefaultDescription = (type: CashMutation["type"]) => {
    if (type === "TOPUP") return "Manual Top-Up";
    if (type === "WITHDRAWAL") return "Cash Withdrawal";
    if (type === "DIVIDEND") return "Stock Dividend";
    return "Transaction";
  };

  // Processing Logic
  const processedMutations = (data?.mutations || [])
    .filter((m) => {
      // 1. Filter by Type (Summary Cards)
      if (typeFilter === "IN") {
        if (m.type !== "TOPUP" && m.type !== "DIVIDEND") return false;
      }
      if (typeFilter === "OUT") {
        if (m.type !== "WITHDRAWAL") return false;
      }
      
      // 2. Filter by Search Query
      if (searchQuery) {
        const descMatch = m.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const typeMatch = getDefaultDescription(m.type).toLowerCase().includes(searchQuery.toLowerCase());
        if (!descMatch && !typeMatch) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // 3. Sort by Criteria
      if (sortBy === "NEWEST") return new Date(b.flow_date).getTime() - new Date(a.flow_date).getTime();
      if (sortBy === "OLDEST") return new Date(a.flow_date).getTime() - new Date(b.flow_date).getTime();
      if (sortBy === "AMOUNT_DESC") return b.amount - a.amount;
      if (sortBy === "AMOUNT_ASC") return a.amount - b.amount;
      return 0;
    });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 px-1">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to Dashboard
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1 text-primary">
            RDN Mutation History
          </h1>
          <p className="text-xs text-muted-foreground">Detailed statement of your capital flows.</p>
        </div>
      </div>

      {/* Summary Row (Interactive Filters) */}
      <div className="grid grid-cols-3 gap-3">
        <button 
          onClick={() => setTypeFilter(typeFilter === "IN" ? "ALL" : "IN")}
          className={cn(
            "rounded-xl border p-3 shadow-sm flex flex-col gap-1 transition-all text-left",
            typeFilter === "IN" 
              ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/20 scale-[1.02]" 
              : "border-border bg-card hover:border-emerald-500/30"
          )}
        >
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <ArrowUpRight className={cn("size-3", typeFilter === "IN" ? "text-emerald-500" : "text-muted-foreground/50")} /> Total In
          </p>
          <p className={cn("text-sm font-bold font-mono tracking-tight truncate", typeFilter === "IN" ? "text-emerald-500" : "text-foreground")}>
            {formatIDR(data?.totalIn || 0)}
          </p>
        </button>
        
        <button 
          onClick={() => setTypeFilter(typeFilter === "OUT" ? "ALL" : "OUT")}
          className={cn(
            "rounded-xl border p-3 shadow-sm flex flex-col gap-1 transition-all text-left",
            typeFilter === "OUT" 
              ? "bg-rose-50 border-rose-500 ring-1 ring-rose-500/20 scale-[1.02]" 
              : "border-border bg-card hover:border-rose-500/30"
          )}
        >
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <ArrowDownLeft className={cn("size-3", typeFilter === "OUT" ? "text-rose-500" : "text-muted-foreground/50")} /> Total Out
          </p>
          <p className={cn("text-sm font-bold font-mono tracking-tight truncate", typeFilter === "OUT" ? "text-rose-500" : "text-foreground")}>
            {formatIDR(data?.totalOut || 0)}
          </p>
        </button>

        <button 
          onClick={() => setTypeFilter("ALL")}
          className={cn(
            "rounded-xl border p-3 shadow-sm flex flex-col gap-1 transition-all text-left",
            typeFilter === "ALL" 
              ? "border-primary bg-primary/5 ring-1 ring-primary/20 scale-[1.02]" 
              : "border-border bg-card hover:border-primary/20"
          )}
        >
          <p className="text-[9px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
            Net Flow
          </p>
          <p className={cn(
            "text-sm font-bold font-mono tracking-tight truncate",
            (data?.netCashflow || 0) >= 0 ? "text-profit" : "text-loss"
          )}>
            {formatIDR(data?.netCashflow || 0)}
          </p>
        </button>
      </div>

      {/* Main Filters (Date Range) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
          <Tabs value={range} onValueChange={setRange} className="w-auto">
            <TabsList className="bg-muted/50 border border-border h-8 p-1">
              {["1W", "1M", "3M", "6M", "YTD", "ALL", "custom"].map((r) => (
                <TabsTrigger 
                  key={r} 
                  value={r}
                  className="h-6 px-3 text-[10px] font-bold rounded-md data-[state=active]:bg-background data-[state=active]:text-primary"
                >
                  {r === "custom" ? "Custom" : r}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {range === "custom" && (
          <div className="animate-in slide-in-from-top-2 duration-300">
             <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>
        )}
      </div>

      {/* Advanced List Header (Search & Sort) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            type="text"
            placeholder="Search description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="h-9 px-3 rounded-lg border border-border bg-card text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
        >
          <option value="NEWEST">Newest</option>
          <option value="OLDEST">Oldest</option>
          <option value="AMOUNT_DESC">Highest</option>
          <option value="AMOUNT_ASC">Lowest</option>
        </select>
      </div>

      {/* Mutations List (Optimized for Mobile/Fluid) */}
      <div className={cn(
        "rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-opacity duration-300",
        loading && "opacity-50 pointer-events-none"
      )}>
        {/* Table Header Replacement */}
        <div className="bg-muted/50 border-b border-border px-4 py-2 flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mutation Details</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount</span>
        </div>

        <div className="flex flex-col">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6">
              <Loader2 className="size-8 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-xs text-foreground font-bold uppercase tracking-wider">Retrieving Statement</p>
                <p className="text-[10px] text-muted-foreground italic mt-0.5">Fetching historical capital movements...</p>
              </div>
            </div>
          ) : processedMutations.length > 0 ? (
            processedMutations.map((m) => (
              <div 
                key={m.id} 
                className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors"
              >
                {/* Left Section: Date, Description, Badge */}
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                      {format(new Date(m.flow_date), "dd MMM yyyy")}
                    </span>
                    
                    {/* Compact Badge Integration */}
                    {m.type === "TOPUP" && (
                      <span className="px-1.5 py-0.5 rounded-full bg-profit/10 text-profit text-[7px] font-extrabold uppercase tracking-tight border border-profit/20">
                        Top-Up
                      </span>
                    )}
                    {m.type === "DIVIDEND" && (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[7px] font-extrabold uppercase tracking-tight border border-blue-500/20">
                        Dividend
                      </span>
                    )}
                    {m.type === "WITHDRAWAL" && (
                      <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[7px] font-extrabold uppercase tracking-tight border border-border">
                        Withdrawal
                      </span>
                    )}
                  </div>
                  
                  <span className="text-xs font-semibold text-foreground leading-snug whitespace-normal break-words">
                    {m.description || getDefaultDescription(m.type)}
                  </span>
                </div>

                {/* Right Section: Amount */}
                <div className={cn(
                  "text-right font-mono text-xs font-bold tabular-nums whitespace-nowrap flex-shrink-0 self-start mt-0.5",
                  m.type === "WITHDRAWAL" ? "text-loss" : "text-profit"
                )}>
                  {m.type === "WITHDRAWAL" ? "-" : "+"}{formatIDR(m.amount)}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
              <History className="size-8 opacity-20 text-muted-foreground" />
              <p className="text-xs text-muted-foreground italic">No transactions match these filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
