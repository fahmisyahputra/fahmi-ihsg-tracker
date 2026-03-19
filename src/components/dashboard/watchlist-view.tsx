"use client";

import { useState } from "react";
import { Plus, Target, CheckCircle2, Paperclip, ExternalLink, Search, Edit3, Save, X, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedReasoning, setEditedReasoning] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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

  const handleDeleteItem = async (id: string) => {
    try {
      // Direct delete from the table
      const { error } = await supabase
        .from("watchlist")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      router.refresh();
    } catch (e) {
      console.error("Error deleting watchlist item:", e);
      alert("Failed to delete item. Please try again.");
    }
  };

  const handleSaveEdit = async (item: WatchlistItem) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("watchlist")
        .update({ reasoning: editedReasoning })
        .eq("id", item.id);

      if (error) throw error;
      
      setIsEditing(false);
      router.refresh();
    } catch (e) {
      console.error("Error updating watchlist reasoning:", e);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredItems = items.filter((item) =>
    item.ticker.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Search Bar */}
      {items.length > 0 && (
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            type="text"
            placeholder="Search watchlist ticker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>
      )}

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
          {filteredItems.map((item) => (
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

                <div className="flex gap-2.5 items-center">
                  <button
                    onClick={() => {
                      setEditedReasoning(item.reasoning);
                      setIsEditing(true);
                      setFocusedItemId(item.id);
                    }}
                    title="Edit trading plan"
                    className="text-muted-foreground hover:text-primary transition-colors p-1"
                  >
                    <Edit3 className="size-4" />
                  </button>

                  <div className="flex gap-2.5">
                  <AlertDialog>
                    <AlertDialogTrigger
                      title="Mark as Done"
                      className="text-muted-foreground hover:text-profit transition-colors"
                    >
                      <CheckCircle2 className="size-5" />
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[90vw] max-w-sm rounded-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mark Plan as Done?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove {item.ticker} from your active watchlist.
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

                  <AlertDialog>
                    <AlertDialogTrigger
                      title="Delete entry"
                      className="text-muted-foreground hover:text-loss transition-colors"
                    >
                      <Trash2 className="size-5" />
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[90vw] max-w-sm rounded-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Watchlist Item?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove the trading plan for {item.ticker}. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteItem(item.id)}
                          className="bg-loss hover:bg-loss/90 text-white"
                        >
                          Delete Permanently
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>

              {/* Read More Dialog Wrapper */}
              <Dialog
                open={focusedItemId === item.id}
                onOpenChange={(open) => setFocusedItemId(open ? item.id : null)}
              >
                <DialogTrigger
                  className="mt-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-sm text-foreground/90 border border-border/50 cursor-pointer group text-left w-full"
                  title="Read full notes"
                  onClick={() => {
                    setEditedReasoning(item.reasoning);
                    setIsEditing(false);
                  }}
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
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                          Conviction / Reasoning
                        </h4>
                        {isEditing && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleSaveEdit(item)}
                              disabled={isSaving}
                              className="flex items-center gap-1 text-[10px] font-bold text-profit hover:underline transition-all disabled:opacity-50"
                            >
                              {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setIsEditing(false);
                                setEditedReasoning(item.reasoning);
                                if (focusedItemId === item.id) {
                                  // If we opened via the card's edit button, canceling should probably close or just show read mode
                                  // For simplicity, let's keep it in the modal but in read mode.
                                }
                              }}
                              disabled={isSaving}
                              className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:underline transition-all disabled:opacity-50"
                            >
                              <X className="size-3" /> Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <textarea
                          value={editedReasoning}
                          onChange={(e) => setEditedReasoning(e.target.value)}
                          className="w-full min-h-[150px] p-3 rounded-lg border border-primary/20 bg-muted/30 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                          placeholder="Why are you watching this stock? What's the catalyst?"
                          autoFocus
                        />
                      ) : (
                        <div className="bg-muted/20 p-3 rounded-lg border border-border/50 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                          {item.reasoning}
                        </div>
                      )}
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
