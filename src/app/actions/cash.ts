"use server";

import { createClient } from "@/utils/supabase/server";
import { startOfYear, subDays, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";

export interface CashMutation {
  id: string;
  type: "TOPUP" | "WITHDRAWAL" | "DIVIDEND";
  amount: number;
  description: string | null;
  flow_date: string;
}

export interface CashStats {
  mutations: CashMutation[];
  totalIn: number;
  totalOut: number;
  netCashflow: number;
}

export async function fetchCashMutations({
  range,
  customRange,
}: {
  range: string;
  customRange?: DateRange;
}): Promise<CashStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  let query = supabase
    .from("cash_flows")
    .select("id, type, amount, description, flow_date")
    .eq("user_id", user.id)
    .in("type", ["TOPUP", "WITHDRAWAL", "DIVIDEND"])
    .order("flow_date", { ascending: false });

  const now = new Date();

  if (range !== "ALL") {
    let startDate: Date;

    if (range === "custom" && customRange?.from) {
      startDate = startOfDay(customRange.from);
      const endDate = customRange.to ? endOfDay(customRange.to) : endOfDay(now);
      query = query.gte("flow_date", startDate.toISOString()).lte("flow_date", endDate.toISOString());
    } else {
      if (range === "1W") startDate = subDays(now, 7);
      else if (range === "1M") startDate = subDays(now, 30);
      else if (range === "3M") startDate = subDays(now, 90);
      else if (range === "6M") startDate = subDays(now, 180);
      else if (range === "YTD") startDate = startOfYear(now);
      else startDate = subDays(now, 30); // Default

      query = query.gte("flow_date", startDate.toISOString());
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching cash mutations:", error);
    return { mutations: [], totalIn: 0, totalOut: 0, netCashflow: 0 };
  }

  const mutations = (data || []).map((m) => ({
    id: m.id,
    type: m.type as "TOPUP" | "WITHDRAWAL" | "DIVIDEND",
    amount: Number(m.amount),
    description: m.description,
    flow_date: m.flow_date,
  }));

  let totalIn = 0;
  let totalOut = 0;

  for (const m of mutations) {
    if (m.type === "WITHDRAWAL") {
      totalOut += m.amount;
    } else {
      totalIn += m.amount; // TOPUP or DIVIDEND
    }
  }

  const netCashflow = totalIn - totalOut;

  return { mutations, totalIn, totalOut, netCashflow };
}
