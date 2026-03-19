"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus, ArrowDownToLine, ArrowUpFromLine, Receipt, TrendingUp, TrendingDown, ArrowLeft } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { CashFlowForm } from "./forms/cash-flow-form";
import { TradeForm } from "./forms/trade-form";

type DrawerView = "menu" | "cashflow-topup" | "cashflow-withdraw" | "cashflow-dividend" | "trade-buy" | "trade-sell";

function ActionFabContent() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<DrawerView>("menu");
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Auto-open drawer if URL contains '?action=...'
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "trade-buy" || action === "trade-sell") {
      setView(action);
      setOpen(true);
    }
  }, [searchParams]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset to menu view after drawer close animation completes
      setTimeout(() => setView("menu"), 300);
      
      // Clean up URL params
      if (searchParams.get("action")) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("action");
        params.delete("ticker");
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(newUrl, { scroll: false });
      }
    }
  };

  const handleSuccess = () => {
    setOpen(false);
    // URL param cleanup is handled by handleOpenChange
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="fixed bottom-20 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 max-w-md"
          style={{ right: "max(1rem, calc(50% - 224px + 1rem))" }}
          aria-label="Quick actions"
        >
          <Plus className="size-6" />
        </button>
      </DrawerTrigger>

      <DrawerContent className="mx-auto max-w-md max-h-[90vh]">
        <DrawerHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            {view !== "menu" && (
              <button
                type="button"
                onClick={() => setView("menu")}
                className="p-1 -ml-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Back to menu"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <DrawerTitle className="text-base font-bold">
              {view === "menu" && "Log Transaction"}
              {view === "cashflow-topup" && "Top-Up (Deposit)"}
              {view === "cashflow-withdraw" && "Withdrawal"}
              {view === "cashflow-dividend" && "Record Dividend"}
              {view === "trade-buy" && "Buy Stock"}
              {view === "trade-sell" && "Sell Stock"}
            </DrawerTitle>
          </div>
        </DrawerHeader>

        <div className="px-4 py-4 overflow-y-auto max-h-[60vh]">
          {view === "menu" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Cash Flow
              </p>
              <div className="flex flex-col gap-1 mb-5">
                <ActionItem
                  icon={<ArrowDownToLine className="size-5 text-profit" />}
                  label="Top-Up (Deposit)"
                  description="Record cash deposit to your RDN"
                  onClick={() => setView("cashflow-topup")}
                />
                <ActionItem
                  icon={<ArrowUpFromLine className="size-5 text-loss" />}
                  label="Withdrawal"
                  description="Record cash withdrawal from your RDN"
                  onClick={() => setView("cashflow-withdraw")}
                />
                <ActionItem
                  icon={<Receipt className="size-5 text-primary" />}
                  label="Dividend"
                  description="Record dividend income received"
                  onClick={() => setView("cashflow-dividend")}
                />
              </div>

              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Trade
              </p>
              <div className="flex flex-col gap-1">
                <ActionItem
                  icon={<TrendingUp className="size-5 text-profit" />}
                  label="Buy Stock"
                  description="Log a stock buy transaction"
                  onClick={() => setView("trade-buy")}
                />
                <ActionItem
                  icon={<TrendingDown className="size-5 text-loss" />}
                  label="Sell Stock"
                  description="Log a stock sell transaction"
                  onClick={() => setView("trade-sell")}
                />
              </div>
            </div>
          )}

          {view.startsWith("cashflow-") && (
            <div className="animate-in slide-in-from-right-4 fade-in duration-200">
              <CashFlowForm
                onSuccess={handleSuccess}
                defaultType={
                  view === "cashflow-topup"
                    ? "TOPUP"
                    : view === "cashflow-withdraw"
                    ? "WITHDRAWAL"
                    : "DIVIDEND"
                }
              />
            </div>
          )}

          {view.startsWith("trade-") && (
            <div className="animate-in slide-in-from-right-4 fade-in duration-200">
              <TradeForm
                onSuccess={handleSuccess}
                defaultType={view === "trade-buy" ? "BUY" : "SELL"}
                defaultTicker={searchParams.get("ticker") ?? ""}
              />
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Wrap in Suspense because we use useSearchParams
export function ActionFab() {
  return (
    <Suspense fallback={null}>
      <ActionFabContent />
    </Suspense>
  );
}

function ActionItem({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/70 active:bg-muted"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
