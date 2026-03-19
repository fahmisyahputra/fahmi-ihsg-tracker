"use client";

import { useState, useTransition } from "react";
import { Plus, Rocket, RotateCcw, Paperclip, Search } from "lucide-react";

import { IpoForm } from "./forms/ipo-form";
import { IpoAllotForm } from "./forms/ipo-allot-form";
import { updateIpoStatus } from "@/app/actions/ipo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatIDR } from "@/lib/twr";
import { cn } from "@/lib/utils";

export interface IpoOrder {
  id: string;
  ticker: string;
  status: "ORDERED" | "ALLOTTED" | "REFUNDED";
  shares_ordered: number;
  price_per_share: number;
  locked_amount: number;
  shares_allotted: number;
  refund_amount: number;
  order_date?: string;
  sell_date?: string;
  attachment_url?: string;
}

interface IpoViewProps {
  orders: IpoOrder[];
}

export function IpoView({ orders }: IpoViewProps) {
  const [openAdd, setOpenAdd] = useState(false);
  const [allotOrderId, setAllotOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleRefund = (id: string) => {
    if (confirm("Are you sure you want to mark this IPO as REFUNDED?")) {
      startTransition(async () => {
        try {
          await updateIpoStatus(id, "REFUNDED");
        } catch (e) {
          console.error(e);
        }
      });
    }
  };

  const filteredOrders = orders.filter((o) => 
    o.ticker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeOrders = filteredOrders.filter((o) => o.status === "ORDERED");
  const pastOrders = filteredOrders.filter((o) => o.status !== "ORDERED");

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Rocket className="size-5 text-primary" /> IPO Dashboard
          </h1>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              <Plus className="size-3.5" /> Log Order
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Place IPO Order</DialogTitle>
              </DialogHeader>
              <IpoForm onSuccess={() => setOpenAdd(false)} />
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground">
          Track your e-IPO orders, cash lockups, and allotments.
        </p>

        {/* Search Bar */}
        {orders.length > 0 && (
          <div className="mt-5 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Search IPO ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            />
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-border rounded-xl">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Rocket className="size-6 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground">
            No IPO orders yet
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
            Log your orders to track locked cash and reconcile allotments seamlessly.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Active Orders Section */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground ml-1">
              Active Locks ({activeOrders.length})
            </h2>
            {activeOrders.length === 0 ? (
              <div className="p-4 border border-border rounded-xl bg-card/50 text-center text-sm text-muted-foreground">
                No active IPO lockups.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {activeOrders.map((order) => {
                  const lotsOrdered = Math.floor(order.shares_ordered / 100);
                  
                  return (
                    <div
                      key={order.id}
                      className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-card p-4 shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1.5">
                          <h3 className="text-lg font-bold font-mono text-foreground leading-none flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                            {order.ticker}
                          </h3>
                          <p className="text-xs text-muted-foreground font-medium">
                            Ordered: <span className="font-mono text-foreground">{lotsOrdered.toLocaleString()}</span> lots @ {formatIDR(order.price_per_share)}
                          </p>
                          {order.order_date && (
                            <p className="text-[10px] text-muted-foreground font-mono">
                              Date: {new Date(order.order_date).toLocaleDateString("id-ID")}
                            </p>
                          )}
                          {order.attachment_url && (
                            <a
                              href={order.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary hover:underline bg-primary/10 px-2 py-1 rounded-md transition-colors w-fit mt-1"
                            >
                              <Paperclip className="size-3" /> View Receipt
                            </a>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                            Locked Cash
                          </p>
                          <p className="font-mono font-bold mt-1 text-sm text-yellow-600 dark:text-yellow-500">
                            {formatIDR(order.locked_amount)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 flex gap-2">
                        <Dialog
                          open={allotOrderId === order.id}
                          onOpenChange={(open) => setAllotOrderId(open ? order.id : null)}
                        >
                          <DialogTrigger className="flex-1 flex h-9 items-center justify-center gap-2 rounded-lg bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/20">
                            Mark as Allotted
                          </DialogTrigger>
                          <DialogContent className="max-w-md bg-card">
                            <DialogHeader>
                              <DialogTitle>Confirm Allotment ({order.ticker})</DialogTitle>
                            </DialogHeader>
                            <IpoAllotForm
                              orderId={order.id}
                              ticker={order.ticker}
                              sharesOrdered={order.shares_ordered}
                              onSuccess={() => setAllotOrderId(null)}
                            />
                          </DialogContent>
                        </Dialog>

                        <button
                          onClick={() => handleRefund(order.id)}
                          disabled={isPending}
                          className="flex-1 flex h-9 items-center justify-center gap-2 rounded-lg bg-muted text-xs font-semibold text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
                        >
                          <RotateCcw className="size-3.5" />
                          Refund (0 Allotted)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Orders Section */}
          {pastOrders.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground ml-1">
                Completed
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {pastOrders.map((order) => {
                  const isAllotted = order.status === "ALLOTTED";
                  const lotsOrdered = Math.floor(order.shares_ordered / 100);
                  const lotsAllotted = Math.floor(order.shares_allotted / 100);
                  const nominalAllotted = order.shares_allotted * order.price_per_share;

                  return (
                    <div
                      key={order.id}
                      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm opacity-90"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-2">
                          <h3 className="text-base font-bold font-mono text-foreground leading-none flex items-center gap-2">
                            {order.ticker}
                            <span
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-widest",
                                isAllotted
                                  ? "bg-profit/10 text-profit"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {order.status}
                            </span>
                          </h3>
                          {order.attachment_url && (
                            <a
                              href={order.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:underline transition-colors w-fit"
                            >
                              <Paperclip className="size-3" /> View Receipt
                            </a>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                            Refunded Cash
                          </p>
                          <p className="font-mono font-bold text-xs text-foreground/80">
                            {formatIDR(order.refund_amount)}
                          </p>
                        </div>
                      </div>

                      {isAllotted && (
                        <div className="flex flex-col gap-2 mt-1 pt-3 border-t border-border/50">
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                            <span>Order: {order.order_date ? new Date(order.order_date).toLocaleDateString("id-ID") : "-"}</span>
                            <span>Listing: {order.sell_date ? new Date(order.sell_date).toLocaleDateString("id-ID") : "-"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-4">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                  Ordered
                                </span>
                                <span className="text-xs font-mono font-semibold">
                                  {lotsOrdered} lots
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-profit uppercase tracking-widest">
                                  Allotted
                                </span>
                                <span className="text-xs font-mono font-bold text-profit">
                                  {lotsAllotted} lots
                                  {order.shares_ordered > 0 && (
                                    <span className="text-[9px] font-medium text-muted-foreground/70 ml-1">
                                      ({((order.shares_allotted / order.shares_ordered) * 100).toFixed(2)}%)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                               <span className="text-[10px] text-profit uppercase tracking-widest block mb-0.5">
                                  Nominal Value
                                </span>
                                <span className="text-xs font-mono font-bold text-profit bg-profit/10 px-2 py-0.5 rounded">
                                  {formatIDR(nominalAllotted)}
                                </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
