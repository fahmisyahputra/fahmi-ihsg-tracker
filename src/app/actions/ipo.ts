"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function addIpoOrder(formData: {
  ticker: string;
  shares_ordered: number;
  price_per_share: number;
  notes?: string;
  attachment_url?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Unauthorized");

  const cleanTicker = formData.ticker.toUpperCase().replace(/\.JK$/, "");
  const lockedAmount = formData.shares_ordered * formData.price_per_share;

  const { error } = await supabase.from("ipo_orders").insert({
    user_id: user.id,
    ticker: cleanTicker,
    shares_ordered: formData.shares_ordered,
    price_per_share: formData.price_per_share,
    locked_amount: lockedAmount,
    status: "ORDERED",
    notes: formData.notes,
    attachment_url: formData.attachment_url,
  });

  if (error) {
    console.error("IPO insert error:", error);
    throw new Error(error.message);
  }

  // Root layout and multiple tabs depend on cashBalance/IPO states
  revalidatePath("/");
  revalidatePath("/ipo");
}

export async function updateIpoStatus(
  id: string,
  newStatus: "ALLOTTED" | "REFUNDED",
  allotmentData?: {
    shares_allotted: number;
    fee_buy?: number;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // 1. Fetch current order details
  const { data: order, error: fetchError } = await supabase
    .from("ipo_orders")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !order) {
    throw new Error(fetchError?.message || "Order not found");
  }

  if (order.status !== "ORDERED") {
    throw new Error(`Order is already ${order.status}.`);
  }

  // Start updating
  if (newStatus === "REFUNDED") {
    const { error: updateError } = await supabase
      .from("ipo_orders")
      .update({
        status: "REFUNDED",
        refund_amount: order.locked_amount,
        refund_date: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) throw new Error(updateError.message);
  } 
  else if (newStatus === "ALLOTTED") {
    if (!allotmentData || allotmentData.shares_allotted <= 0) {
      throw new Error("Must provide allotted shares.");
    }

    const { shares_allotted, fee_buy = 0 } = allotmentData;
    const actualCost = (shares_allotted * order.price_per_share) + fee_buy;
    const refundAmount = Math.max(0, order.locked_amount - actualCost);
    const nowISO = new Date().toISOString();

    // 1. Update IPO Order
    const { error: updateError } = await supabase
      .from("ipo_orders")
      .update({
        status: "ALLOTTED",
        shares_allotted: shares_allotted,
        refund_amount: refundAmount,
        allotment_date: nowISO,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) throw new Error(updateError.message);

    // 2. Create a BUY transaction so the shares enter the Active Portfolio
    // Standard IDX is 1 lot = 100 shares. We store transactions in lots.
    const lots = Math.floor(shares_allotted / 100);

    const { error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "BUY",
        ticker: order.ticker,
        price: order.price_per_share,
        lots: lots > 0 ? lots : 1, // Fallback if user inputs odd lots
        fee: 0, // Explicitly ensure fee = 0 for auto-created BUY transactions upon Allotment
        transaction_date: nowISO,
        notes: `IPO Allotment for ${order.ticker}`,
      });

    if (txError) throw new Error("Failed to insert BUY transaction: " + txError.message);
  }

  revalidatePath("/");
  revalidatePath("/ipo");
  revalidatePath("/stocks");
}
