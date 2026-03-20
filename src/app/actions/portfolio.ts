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

  // ── Smart Auto-Journal Integration (Context-Aware) ──────────────────────
  // Sync to Journal after transaction success. Ensure constraints are handled.
  try {
    if (data.type === "BUY") {
      const { error: journalError } = await supabase.from('journals').insert({
        user_id: user.id,
        ticker: cleanTicker,
        buy_date: data.transaction_date,
        buy_price: data.price,
        lots: data.lots,
        fee_buy: data.fee,
        initial_reasoning: '-',
        reflection: '-',
        trade_type: 'REGULAR'
      });
      if (journalError) {
        console.error("FATAL JOURNAL ERROR (INSERT):", journalError);
      }
    } else if (data.type === "SELL") {
      // Find the active (unsold) journal for this ticker: sell_price IS NULL
      const { data: openJournal, error: findError } = await supabase.from('journals')
        .select('id')
        .eq('ticker', cleanTicker)
        .eq('user_id', user.id)
        .is('sell_price', null)
        .order('buy_date', { ascending: true })
        .limit(1)
        .single();

      if (findError) {
        console.error("JOURNAL SYNC: No open position found forTicker", cleanTicker, findError);
      }

      if (openJournal) {
        const { error: updateError } = await supabase.from('journals').update({
          sell_date: data.transaction_date,
          sell_price: data.price,
          fee_sell: data.fee
        }).eq('id', openJournal.id);

        if (updateError) {
          console.error("FATAL JOURNAL ERROR (UPDATE):", updateError);
        }
      }
    }
  } catch (journalError) {
    console.error("UNEXPECTED JOURNAL SYNC FAILURE:", journalError);
  }

  revalidatePath("/", "layout");
  revalidatePath("/journal");
}
