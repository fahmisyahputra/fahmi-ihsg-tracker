"use client";

import { cn } from "@/lib/utils";
import { formatIDR, formatReturnPercent } from "@/lib/twr";
import type { MutualFund } from "@/lib/dashboard-data";
import { TrendingDown, TrendingUp, Edit3 } from "lucide-react";
import { UpdateNavModal } from "@/components/dashboard/forms/update-nav-modal";
import { useState } from "react";

interface MutualFundCardProps {
  fund: MutualFund;
}

export function MutualFundCard({ fund }: MutualFundCardProps) {
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const pnl = fund.current_value - fund.invested_amount;
  const pnlPercent = fund.invested_amount > 0 ? (pnl / fund.invested_amount) * 100 : 0;
  const isPositive = pnl >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-4">
      {/* Header: Fund Name, Type */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground truncate">
              {fund.fund_name}
            </h3>
          </div>
          <p className="mt-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {fund.type} <span className="mx-1 opacity-20">•</span> 
            Invested {formatIDR(fund.invested_amount)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold font-mono text-foreground">
            {formatIDR(fund.current_value)}
          </p>
          <div className="mt-0.5 flex items-center justify-end gap-1">
            <span
              className={cn(
                "text-[10px] font-semibold font-mono",
                isPositive ? "text-profit" : "text-loss"
              )}
            >
              {formatReturnPercent(pnlPercent)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: PnL + Update Action */}
      <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-1">
        <div className="flex items-center gap-2">
           <div className={cn(
             "flex size-6 items-center justify-center rounded-full",
             isPositive ? "bg-profit-muted text-profit" : "bg-loss-muted text-loss"
           )}>
             {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
           </div>
           <p className={cn(
             "text-xs font-bold font-mono",
             isPositive ? "text-profit" : "text-loss"
           )}>
             {isPositive ? "+" : ""}{formatIDR(pnl)}
           </p>
        </div>

        <button
          onClick={() => setIsUpdateModalOpen(true)}
          className="flex h-8 items-center gap-1.5 px-3 rounded-md border border-border bg-background text-[10px] font-semibold text-foreground hover:bg-muted transition-colors"
        >
          <Edit3 className="size-3" />
          Update NAV
        </button>
      </div>

      <UpdateNavModal 
        fund={fund}
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
      />
    </div>
  );
}
