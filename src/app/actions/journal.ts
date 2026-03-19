"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function addWatchlistItem(formData: {
  ticker: string;
  target_buy_price: number;
  reasoning: string;
  attachment_url?: string;
}) {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be logged in to add to your watchlist.");
  }

  // 2. format ticker
  const cleanTicker = formData.ticker.toUpperCase().replace(/\.JK$/, "");

  // 3. Insert into watchlist
  const { error } = await supabase.from("watchlist").insert({
    user_id: user.id,
    ticker: cleanTicker,
    target_buy_price: formData.target_buy_price,
    reasoning: formData.reasoning,
    attachment_url: formData.attachment_url,
    is_active: true,
  });

  if (error) {
    console.error("Watchlist insert error:", error);
    throw new Error(error.message);
  }

  // 4. Revalidate the journal page to instantly show the new item
  revalidatePath("/journal");
}

export async function removeWatchlistItem(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Soft delete by setting is_active = false
  const { error } = await supabase
    .from("watchlist")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Watchlist remove error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/journal");
}

export async function addJournalEntry(formData: {
  ticker: string;
  buy_date: string;
  sell_date: string;
  buy_price: number;
  sell_price: number;
  lots: number;
  fee_buy?: number;
  fee_sell?: number;
  initial_reasoning?: string;
  reflection?: string;
  target_price?: number;
  stop_loss?: number;
  trade_type?: "REGULAR" | "IPO";
  attachment_url?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const cleanTicker = formData.ticker.toUpperCase().replace(/\.JK$/, "");

  const { error } = await supabase.from("journals").insert({
    user_id: user.id,
    ticker: cleanTicker,
    buy_date: new Date(formData.buy_date).toISOString(),
    sell_date: new Date(formData.sell_date).toISOString(),
    buy_price: formData.buy_price,
    sell_price: formData.sell_price,
    lots: formData.lots,
    fee_buy: formData.fee_buy ?? 0,
    fee_sell: formData.fee_sell ?? 0,
    initial_reasoning: formData.initial_reasoning,
    reflection: formData.reflection,
    target_price: formData.target_price,
    stop_loss: formData.stop_loss,
    trade_type: formData.trade_type || "REGULAR",
    attachment_url: formData.attachment_url,
  });

  if (error) {
    console.error("Journal insert error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/journal");
}

export async function deleteJournalEntry(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("journals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Journal delete error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/journal");
}
