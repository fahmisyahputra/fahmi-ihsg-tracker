"use client";

import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { formatIDR, formatReturnPercent } from "@/lib/twr";
import { cn } from "@/lib/utils";
import { Calendar, TrendingUp, ArrowRight, Info, History } from "lucide-react";
import { format } from "date-fns";

interface PerformanceReasoningModalProps {
  type: "TWR" | "MWR";
  value: number;
  // TWR specific data
  startingEquity?: number;
  netCashFlow?: number;
  currentEquity?: number;
  // MWR specific data
  cashFlows?: { date: string; amount: number; type: string }[];
  trigger: React.ReactElement;
}

export function PerformanceReasoningModal({
  type,
  value,
  startingEquity = 0,
  netCashFlow = 0,
  currentEquity = 0,
  cashFlows = [],
  trigger,
}: PerformanceReasoningModalProps) {
  const isPositive = value >= 0;

  return (
    <Dialog>
      <DialogTrigger
        render={trigger}
      />
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className={cn(
              "p-2 rounded-lg",
              isPositive ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
            )}>
              <TrendingUp className="size-4" />
            </div>
            <DialogTitle className="text-lg">
              How is your {type} calculated?
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            {type === "TWR"
              ? `This YTD TWR measures your portfolio's performance from January 1st of the current year to today, neutralizing the impact of when you added or removed cash.`
              : `This YTD MWR (XIRR) calculates the annualized growth rate of your money from January 1st to today, giving more weight to periods where you had more capital invested.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Main Number */}
          <div className="flex flex-col items-center justify-center py-6 rounded-2xl bg-accent/30 border border-border/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Your YTD {type}
            </p>
            <h3 className={cn(
              "text-4xl font-black font-mono tracking-tighter",
              isPositive ? "text-profit" : "text-loss"
            )}>
              {formatReturnPercent(value)}
            </h3>
          </div>

          {type === "TWR" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                    <Calendar className="size-3.5" /> Starting (Jan 1)
                  </div>
                  <span className="font-mono font-bold text-sm">{formatIDR(startingEquity)}</span>
                </div>
                
                <div className="flex items-center justify-center">
                  <ArrowRight className="size-4 text-muted-foreground/30 rotate-90 sm:rotate-0" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                    <Info className="size-3.5" /> Net Cash Flows
                  </div>
                  <span className="font-mono font-bold text-sm text-blue-500">
                    {netCashFlow >= 0 ? "+" : ""}{formatIDR(netCashFlow)}
                  </span>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight className="size-4 text-muted-foreground/30 rotate-90 sm:rotate-0" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase">
                    <TrendingUp className="size-3.5" /> Current Equity
                  </div>
                  <span className="font-mono font-bold text-sm text-foreground">{formatIDR(currentEquity)}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">The Formula (Simplified)</p>
                <code className="text-[11px] block text-center py-2 font-mono bg-background/50 rounded border border-border/50">
                  (Current - Starting - Net Flows) / Starting
                </code>
                <p className="text-[9px] mt-2 text-muted-foreground italic leading-tight">
                  *We use a sub-period linking method to ensure cash flow timing doesn't distort your performance pick accuracy.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <History className="size-3.5" /> XIRR Ledger (YTD)
                </p>
                <span className="text-[9px] font-medium text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted border border-border">
                  {cashFlows.length + 1} Points
                </span>
              </div>

              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="py-2 px-3 font-bold uppercase tracking-tighter text-muted-foreground">Date</th>
                      <th className="py-2 px-3 font-bold uppercase tracking-tighter text-muted-foreground">Type</th>
                      <th className="py-2 px-3 font-bold uppercase tracking-tighter text-right text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 font-mono">
                    {cashFlows.slice(0, 8).map((cf, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="py-2 px-3 text-zinc-500">{format(new Date(cf.date), "dd MMM yy")}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-[9px]">
                          {cf.type === "YEAR_START" ? "STARTING BALANCE" : cf.type}
                        </td>
                        <td className={cn(
                          "py-2 px-3 text-right font-bold",
                          cf.type === "TOPUP" || cf.type === "YEAR_START" ? "text-loss" : "text-profit"
                        )}>
                          {cf.type === "TOPUP" || cf.type === "YEAR_START" ? "-" : "+"}{formatIDR(cf.amount)}
                        </td>
                      </tr>
                    ))}
                    {cashFlows.length > 8 && (
                      <tr>
                        <td colSpan={3} className="py-2 px-3 text-center text-muted-foreground italic text-[9px]">
                          + {cashFlows.length - 8} more transactions...
                        </td>
                      </tr>
                    )}
                    <tr className="bg-primary/5">
                      <td className="py-2 px-3 text-primary font-bold italic">{format(new Date(), "dd MMM yy")}</td>
                      <td className="py-2 px-3 font-sans font-bold text-[9px] text-primary">LIQUIDATION*</td>
                      <td className="py-2 px-3 text-right font-bold text-primary">
                        +{formatIDR(currentEquity)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-xl bg-profit/5 border border-profit/20">
                <p className="text-[9px] text-profit/80 leading-relaxed italic">
                  *XIRR finds the interest rate that makes the Net Present Value of all your cash flows equal to zero, treating your current equity as 
                  the final inflow today.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
