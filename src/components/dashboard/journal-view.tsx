"use client";

import { useState, useTransition } from "react";
import { 
  Plus, 
  BookOpen, 
  Quote, 
  Paperclip, 
  ExternalLink,
  Trash2
} from "lucide-react";

import { JournalForm } from "./forms/journal-form";
import { deleteJournalEntry } from "@/app/actions/journal";
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
import { cn } from "@/lib/utils";

export interface JournalEntry {
  id: string;
  ticker: string;
  buy_date: string;
  sell_date: string;
  buy_price: number;
  sell_price: number;
  lots: number;
  initial_reasoning: string | null;
  reflection: string | null;
  realized_pnl: number;
  attachment_url?: string;
}

interface JournalViewProps {
  entries: JournalEntry[];
}

export function JournalView({ entries }: JournalViewProps) {
  const [openAdd, setOpenAdd] = useState(false);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [isDeleting, startDeletion] = useTransition();

  const handleSuccess = () => {
    setOpenAdd(false);
  };

  const handleDelete = (id: string) => {
    startDeletion(async () => {
      try {
        await deleteJournalEntry(id);
      } catch (error) {
        console.error("Failed to delete journal entry", error);
      }
    });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Trade Journal</h2>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            <Plus className="size-3.5" />
            Log Trade
          </DialogTrigger>
          <DialogContent className="max-w-md bg-card max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log Closed Trade</DialogTitle>
            </DialogHeader>
            <JournalForm onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border rounded-xl">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <BookOpen className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            No journal entries yet
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
            Record your closed trades and reflections to improve your strategy over time.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-8">
          {entries.map((entry) => {
            const isProfit = entry.realized_pnl >= 0;
            return (
              <div
                key={entry.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-3 group relative"
              >
                {/* Header Row */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold font-mono text-foreground leading-none">
                      {entry.ticker}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1 tracking-wide">
                      {formatDate(entry.buy_date)} ➔ {formatDate(entry.sell_date)}
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-widest">
                        Realized PnL
                      </p>
                      <p
                        className={cn(
                          "font-mono font-bold mt-0.5 text-sm",
                          isProfit ? "text-profit" : "text-loss"
                        )}
                      >
                        {isProfit ? "+" : ""}
                        {formatIDR(entry.realized_pnl)}
                      </p>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger
                        title="Delete journal entry"
                        className="text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                      >
                        <Trash2 className="size-4" />
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[90vw] max-w-sm rounded-xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Journal Entry?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete your reflections and log for {entry.ticker}. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(entry.id)}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                          >
                            Delete Entry
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="flex items-center gap-4 text-xs mt-1">
                  <div className="flex flex-col font-mono">
                    <span className="text-muted-foreground text-[10px] tracking-widest uppercase">Buy Avg</span>
                    <span className="font-semibold">{formatIDR(entry.buy_price)}</span>
                  </div>
                  <div className="flex flex-col font-mono">
                    <span className="text-muted-foreground text-[10px] tracking-widest uppercase">Sell Avg</span>
                    <span className="font-semibold">{formatIDR(entry.sell_price)}</span>
                  </div>
                  <div className="flex flex-col font-mono">
                    <span className="text-muted-foreground text-[10px] tracking-widest uppercase">Lots</span>
                    <span className="font-semibold">{entry.lots}</span>
                  </div>
                </div>

                {/* Combined Read More Wrapper for Reflections */}
                {(entry.initial_reasoning || entry.reflection) && (
                  <Dialog
                    open={focusedItemId === entry.id}
                    onOpenChange={(open) => setFocusedItemId(open ? entry.id : null)}
                  >
                    <DialogTrigger
                      className="mt-2 border-t border-border/50 pt-3 text-left w-full cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative group-hover:bg-muted/10 p-1 -mx-1 rounded-lg">
                        {entry.initial_reasoning && (
                          <div className="flex items-start gap-2 bg-muted/30 p-2 rounded-lg border border-border/50 h-full">
                            <Quote className="size-3 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="w-full">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                                Initial Thesis
                              </p>
                              <p className="text-xs text-foreground/90 mt-0.5 italic line-clamp-2">
                                {entry.initial_reasoning}
                              </p>
                            </div>
                          </div>
                        )}
                        {entry.reflection && (
                          <div className="flex items-start gap-2 bg-muted/30 p-2 rounded-lg border border-border/50 h-full">
                            <BookOpen className="size-3 text-primary shrink-0 mt-0.5" />
                            <div className="w-full">
                              <p className="text-[10px] font-semibold text-primary/80 uppercase tracking-widest">
                                Post-Trade Reflection
                              </p>
                              <p className="text-xs text-foreground/90 mt-0.5 font-medium line-clamp-2">
                                {entry.reflection}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] font-semibold text-primary mt-2 flex items-center justify-end gap-1 px-1">
                        <ExternalLink className="size-3" /> Read full note
                      </p>
                    </DialogTrigger>

                    <DialogContent className="w-[95vw] max-w-md bg-card max-h-[85vh] overflow-y-auto rounded-xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-mono text-xl">
                          {entry.ticker}
                          <span className={cn(
                            "text-[10px] font-sans font-bold uppercase tracking-widest px-2 py-1 rounded-md",
                            isProfit ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
                          )}>
                            {isProfit ? "+" : ""}{formatIDR(entry.realized_pnl)}
                          </span>
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-5 py-2">
                        {entry.initial_reasoning && (
                          <div>
                            <h4 className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                              <Quote className="size-3" /> Initial Thesis
                            </h4>
                            <div className="bg-muted/20 p-3 rounded-lg border border-border/50 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 italic">
                              {entry.initial_reasoning}
                            </div>
                          </div>
                        )}

                        {entry.reflection && (
                          <div>
                            <h4 className="flex items-center gap-1.5 text-[10px] font-semibold text-primary uppercase tracking-widest mb-2">
                              <BookOpen className="size-3" /> Post-Trade Reflection
                            </h4>
                            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 text-sm leading-relaxed whitespace-pre-wrap text-foreground font-medium">
                              {entry.reflection}
                            </div>
                          </div>
                        )}

                        {entry.attachment_url && (
                          <div>
                            <h4 className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 mt-2">
                              Attachment
                            </h4>
                            <a
                              href={entry.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 transition-colors text-foreground text-sm font-semibold p-3 rounded-lg border border-border"
                            >
                              <Paperclip className="size-4" />
                              View Attached File
                            </a>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Inline Quick Attachment Link */}
                {entry.attachment_url && (
                  <div className="mt-0.5">
                    <a
                      href={entry.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline bg-primary/5 px-2.5 py-1.5 rounded-md transition-colors w-fit"
                    >
                      <Paperclip className="size-3.5" /> Attachment snippet
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
