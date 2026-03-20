import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WatchlistView, type WatchlistItem } from "@/components/dashboard/watchlist-view";
import { JournalView, type JournalEntry } from "@/components/dashboard/journal-view";
import { BookMarked } from "lucide-react";

export const dynamic = "force-dynamic";

async function getJournalData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { watchlist: [], journals: [] };
  }

  // Fetch active watchlist items
  const { data: watchlist } = await supabase
    .from("watchlist")
    .select("id, ticker, target_buy_price, reasoning, attachment_url")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // Fetch historical journal entries
  const { data: journals } = await supabase
    .from("journals")
    .select(
      "id, ticker, buy_date, sell_date, buy_price, sell_price, lots, initial_reasoning, reflection, realized_pnl, trade_type, attachment_url"
    )
    .eq("user_id", user.id)
    .order("sell_date", { ascending: false })
    .order("buy_date", { ascending: false });

  return {
    watchlist: (watchlist as WatchlistItem[]) || [],
    journals: (journals as JournalEntry[]) || [],
  };
}

export default async function JournalPage() {
  const { watchlist, journals } = await getJournalData();

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BookMarked className="size-5 text-primary" /> Journal & Watchlist
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plan future trades and reflect on your past performance.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="h-64 rounded-xl border border-border bg-muted animate-pulse" />
        }
      >
        <Tabs defaultValue="watchlist" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-muted/50">
            <TabsTrigger value="watchlist" className="font-semibold text-sm h-10">
              Watchlist
            </TabsTrigger>
            <TabsTrigger value="journal" className="font-semibold text-sm h-10">
              Trade Journal
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="watchlist" className="mt-0 outline-none">
            <WatchlistView items={watchlist} />
          </TabsContent>
          
          <TabsContent value="journal" className="mt-0 outline-none">
            <JournalView entries={journals} />
          </TabsContent>
        </Tabs>
      </Suspense>
    </div>
  );
}
