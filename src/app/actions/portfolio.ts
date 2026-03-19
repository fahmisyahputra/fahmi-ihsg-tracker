"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

// ── Cash Flow Actions ──────────────────────────────────────────────────────

export async function addCashFlow(data: {
  type: "TOPUP" | "WITHDRAWAL" | "DIVIDEND";
  amount: number;
  description?: string;
  flow_date: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase.from("cash_flows").insert({
    user_id: user.id,
    type: data.type,
    amount: data.amount,
    description: data.description,
    flow_date: data.flow_date,
  });

  if (error) {
    console.error("Error adding cash flow:", error);
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
}

// ── Trade Actions ──────────────────────────────────────────────────────────

export async function addTransaction(data: {
  type: "BUY" | "SELL";
  ticker: string;
  price: number;
  lots: number;
  fee: number;
  transaction_date: string;
  notes?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Ensure ticker format (uppercase, strip .JK if user typed it, we save bare ticker to DB)
  // Our stock-api handles adding .JK for yahoo finance, but in DB we prefer clean BMRI, BBCA, etc.
  const cleanTicker = data.ticker.toUpperCase().replace(/\.JK$/i, "");

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: data.type,
    ticker: cleanTicker,
    price: data.price,
    lots: data.lots,
    fee: data.fee,
    transaction_date: data.transaction_date,
    notes: data.notes,
  });

  if (error) {
    console.error("Error adding transaction:", error);
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
}
