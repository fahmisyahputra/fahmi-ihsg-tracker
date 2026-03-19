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
  History
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
  const [range, setRange] = useState("1M");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [data, setData] = useState<CashStats | null>(null);
  const [loading, setLoading] = useState(true);

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

      {/* Summary Row (Banking Standard) */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm flex flex-col gap-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <ArrowUpRight className="size-3 text-profit" /> Total In
          </p>
          <p className="text-sm font-bold font-mono tracking-tight text-profit truncate">
            {formatIDR(data?.totalIn || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm flex flex-col gap-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <ArrowDownLeft className="size-3 text-loss" /> Total Out
          </p>
          <p className="text-sm font-bold font-mono tracking-tight text-loss truncate">
            {formatIDR(data?.totalOut || 0)}
          </p>
        </div>
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-3 shadow-sm flex flex-col gap-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
            Net Flow
          </p>
          <p className={cn(
            "text-sm font-bold font-mono tracking-tight truncate",
            (data?.netCashflow || 0) >= 0 ? "text-profit" : "text-loss"
          )}>
            {formatIDR(data?.netCashflow || 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
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

      {/* Mutations Table (Stacked for Mobile) */}
      <div className={cn(
        "rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-opacity duration-300",
        loading && "opacity-50 pointer-events-none"
      )}>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest px-3">Date & Description</TableHead>
              <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest px-3 text-center">Badges</TableHead>
              <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest text-right px-3 whitespace-nowrap">Amount (Rp)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-48 text-center px-6">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="size-8 text-primary animate-spin" />
                    <div className="space-y-1">
                       <p className="text-xs text-foreground font-bold uppercase tracking-wider">Retrieving Statement</p>
                       <p className="text-[10px] text-muted-foreground italic">Fetching historical capital movements...</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : data?.mutations.length && data.mutations.length > 0 ? (
              data.mutations.map((m) => (
                <TableRow key={m.id} className="border-border hover:bg-muted/20">
                  <TableCell className="py-3 px-3 min-w-[140px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                        {format(new Date(m.flow_date), "dd MMM yyyy")}
                      </span>
                      <span className="text-xs font-semibold text-foreground line-clamp-1 leading-tight">
                        {m.description || getDefaultDescription(m.type)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-3">
                    <div className="flex justify-center">
                      {m.type === "TOPUP" && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-profit/10 text-profit text-[8px] font-extrabold uppercase tracking-tight whitespace-nowrap border border-profit/20">
                          Top-Up
                        </div>
                      )}
                      {m.type === "DIVIDEND" && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[8px] font-extrabold uppercase tracking-tight whitespace-nowrap border border-blue-500/20">
                          Dividend
                        </div>
                      )}
                      {m.type === "WITHDRAWAL" && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[8px] font-extrabold uppercase tracking-tight whitespace-nowrap border border-border">
                          Withdrawal
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={cn(
                    "py-3 px-3 text-right font-mono text-[12px] font-bold tabular-nums whitespace-nowrap",
                    m.type === "WITHDRAWAL" ? "text-loss" : "text-profit"
                  )}>
                    {m.type === "WITHDRAWAL" ? "-" : "+"}{formatIDR(m.amount)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-xs text-muted-foreground italic py-10">
                   <div className="flex flex-col items-center gap-2">
                     <History className="size-8 opacity-20" />
                     <p>No transactions found for this period.</p>
                   </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
