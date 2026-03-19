"use client";

import { useState } from "react";
import { Plus, Target, CheckCircle2, Paperclip, ExternalLink } from "lucide-react";
import { WatchlistForm } from "./forms/watchlist-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatIDR } from "@/lib/twr";
import { removeWatchlistItem } from "@/app/actions/journal";

export interface WatchlistItem {
  id: string;
  ticker: string;
  target_buy_price: number;
  reasoning: string;
  attachment_url?: string;
}

interface WatchlistViewProps {
  items: WatchlistItem[];
}

export function WatchlistView({ items }: WatchlistViewProps) {
  const [openAdd, setOpenAdd] = useState(false);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  const handleSuccess = () => {
    setOpenAdd(false);
  };

  const handleMarkDone = async (id: string) => {
    try {
      await removeWatchlistItem(id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Trading Plans</h2>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            <Plus className="size-3.5" />
            Add Plan
          </DialogTrigger>
          <DialogContent className="max-w-md bg-card">
            <DialogHeader>
              <DialogTitle>Add to Watchlist</DialogTitle>
            </DialogHeader>
            <WatchlistForm onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border rounded-xl">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <Target className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Watchlist is empty
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
            Keep track of stocks you want to buy by adding them to your watchlist.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold font-mono text-foreground leading-none">
                    {item.ticker}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-1.5">
                    Target:{" "}
                    <span className="font-mono text-foreground/90">
                      {formatIDR(item.target_buy_price)}
                    </span>
                  </p>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger
                    title="Mark as Done / Remove"
                    className="text-muted-foreground hover:text-profit transition-colors"
                  >
                    <CheckCircle2 className="size-5" />
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[90vw] max-w-sm rounded-xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark Plan as Done?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove {item.ticker} from your active watchlist. You cannot undo this action directly.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleMarkDone(item.id)}
                        className="bg-profit hover:bg-profit/90 text-white"
                      >
                        Yes, Mark as Done
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Read More Dialog Wrapper */}
              <Dialog
                open={focusedItemId === item.id}
                onOpenChange={(open) => setFocusedItemId(open ? item.id : null)}
              >
                <DialogTrigger
                  className="mt-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-sm text-foreground/90 border border-border/50 cursor-pointer group text-left w-full"
                  title="Read full notes"
                >
                  <p className="line-clamp-3 leading-relaxed">{item.reasoning}</p>
                  <p className="text-[10px] font-semibold text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <ExternalLink className="size-3" /> Read full notes
                  </p>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md bg-card max-h-[85vh] overflow-y-auto rounded-xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-mono text-xl">
                      {item.ticker}
                      <span className="text-[10px] font-sans font-semibold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded-md">
                        Trading Plan
                      </span>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                        Target Buy Price
                      </h4>
                      <p className="font-mono font-bold text-foreground bg-muted/40 p-2 rounded-md border border-border/50 w-fit">
                        {formatIDR(item.target_buy_price)}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                        Conviction / Reasoning
                      </h4>
                      <div className="bg-muted/20 p-3 rounded-lg border border-border/50 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                        {item.reasoning}
                      </div>
                    </div>

                    {item.attachment_url && (
                      <div>
                        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 mt-2">
                          Attachment
                        </h4>
                        <a
                          href={item.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-sm font-semibold p-3 rounded-lg border border-primary/20"
                        >
                          <Paperclip className="size-4" />
                          View Attachment (Click to open)
                        </a>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Inline Attachment View for quick access */}
              {item.attachment_url && (
                <div className="mt-2.5">
                  <a
                    href={item.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline bg-primary/5 px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    <Paperclip className="size-3.5" /> Attachment
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
