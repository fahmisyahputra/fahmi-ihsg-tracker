/**
 * Performance data fetching and aggregation — server-side only.
 */

import { createClient } from "@/utils/supabase/server";
import { getDashboardData } from "@/lib/dashboard-data";
import { startOfMonth, format, startOfYear, subDays, differenceInDays } from "date-fns";

export interface TimelineData {
  label: string;
  realizedPnL: number;
  dividendYield: number;
  ipoPnL: number;
  simulatedEquity: number;
}

export interface PerformanceStats {
  totalEquity: number;
  nominalGrowth: number;
  percentGrowth: number;
  monthlyData: TimelineData[]; // Keeping name for compatibility, but content is dynamic
  topMovers: { ticker: string; pnl: number; pnlPercent: number }[];
}

export async function getPerformanceData(filters: {
  year: string;
  range: string;
  customRange?: { from: Date; to: Date };
}): Promise<PerformanceStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalEquity: 0,
      nominalGrowth: 0,
      percentGrowth: 0,
      monthlyData: [],
      topMovers: [],
    };
  }

  // 1. Get Real-time Core Metrics (Total Equity Now)
  const dashboard = await getDashboardData();
  const { totalEquity } = dashboard;

  // 2. Determine Date Range Filter
  let startDate = startOfYear(new Date());
  let endDate = new Date();

  if (filters.year !== "custom" && filters.year !== "this_year") {
    const y = parseInt(filters.year);
    startDate = new Date(y, 0, 1);
    endDate = new Date(y, 11, 31, 23, 59, 59);
  } else if (filters.year === "custom" && filters.customRange) {
    startDate = filters.customRange.from;
    endDate = filters.customRange.to;
  } else {
    // Current Year (default for range filters like 1M, 6M)
    if (filters.range === "1W") startDate = subDays(new Date(), 7);
    else if (filters.range === "1M") startDate = subDays(new Date(), 30);
    else if (filters.range === "3M") startDate = subDays(new Date(), 90);
    else if (filters.range === "6M") startDate = subDays(new Date(), 180);
    else if (filters.range === "YTD") startDate = startOfYear(new Date());
    else if (filters.range === "ALL") startDate = new Date(2010, 0, 1); // Older fallback
  }

  // 3. Determine Granularity
  const daysDiff = differenceInDays(endDate, startDate);
  const useDaily = daysDiff <= 45; // 1W and 1M use daily

  // 4. Fetch Data
  const [journalsRes, dividendsRes, snapshotsRes] = await Promise.all([
    supabase
      .from("journals")
      .select("ticker, sell_date, realized_pnl, buy_price, sell_price, lots")
      .eq("user_id", user.id)
      .gte("sell_date", startDate.toISOString())
      .lte("sell_date", endDate.toISOString()),
    supabase
      .from("cash_flows")
      .select("flow_date, amount")
      .eq("user_id", user.id)
      .eq("type", "DIVIDEND")
      .gte("flow_date", startDate.toISOString())
      .lte("flow_date", endDate.toISOString()),
    supabase
      .from("portfolio_snapshots")
      .select("snapshot_date, total_equity")
      .eq("user_id", user.id)
      .gte("snapshot_date", startDate.toISOString().split("T")[0])
      .lte("snapshot_date", endDate.toISOString().split("T")[0])
      .order("snapshot_date", { ascending: true })
  ]);

  const journals = journalsRes.data;
  const dividends = dividendsRes.data;
  const snapshots = snapshotsRes.data;

  // 5. Aggregate Top Movers
  const moversMap = new Map<string, { pnl: number; cost: number }>();
  if (journals) {
    for (const j of journals) {
      const current = moversMap.get(j.ticker) || { pnl: 0, cost: 0 };
      current.pnl += Number(j.realized_pnl);
      current.cost += Number(j.buy_price) * Number(j.lots) * 100;
      moversMap.set(j.ticker, current);
    }
  }

  const topMovers = Array.from(moversMap.entries()).map(([ticker, data]) => ({
    ticker,
    pnl: data.pnl,
    pnlPercent: data.cost > 0 ? (data.pnl / data.cost) * 100 : 0
  }));

  // 6. Timeline Aggregation
  const timelineMap = new Map<string, TimelineData>();
  
  const addToTimeline = (date: Date, pnl = 0, div = 0, equity = 0) => {
    // Label format: daily "15 Mar" vs monthly "Mar"
    const label = useDaily ? format(date, "d MMM") : format(date, "MMM yyyy");
    // Sorting key
    const sortKey = useDaily ? format(date, "yyyy-MM-dd") : format(date, "yyyy-MM");

    const existing = timelineMap.get(sortKey) || {
      label,
      realizedPnL: 0,
      dividendYield: 0,
      ipoPnL: 0,
      simulatedEquity: equity,
    };
    existing.realizedPnL += pnl;
    existing.dividendYield += div;
    if (equity > 0) existing.simulatedEquity = equity;
    timelineMap.set(sortKey, existing);
  };

  if (journals) journals.forEach(j => addToTimeline(new Date(j.sell_date), Number(j.realized_pnl)));
  if (dividends) dividends.forEach(d => addToTimeline(new Date(d.flow_date), 0, Number(d.amount)));
  if (snapshots) snapshots.forEach(s => addToTimeline(new Date(s.snapshot_date), 0, 0, Number(s.total_equity)));

  // 7. Day 1 Fallback: Inject Live Point if missing for today
  const todayKey = useDaily ? format(new Date(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM");
  if (!timelineMap.has(todayKey)) {
    addToTimeline(new Date(), 0, 0, totalEquity);
  }

  // Ensure sorting by sortKey (date)
  const sortedHistory = Array.from(timelineMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([_, data]) => data);

  // Growth Calculation using snapshots (Actual delta)
  // Get starting equity from first available snapshot on or before start date
  const { data: startSnapshot } = await supabase
    .from("portfolio_snapshots")
    .select("total_equity")
    .eq("user_id", user.id)
    .lte("snapshot_date", startDate.toISOString().split("T")[0])
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  const startEquityVal = startSnapshot ? Number(startSnapshot.total_equity) : (snapshots && snapshots.length > 0 ? Number(snapshots[0].total_equity) : totalEquity);
  const nominalGrowth = totalEquity - startEquityVal;
  const percentGrowth = startEquityVal > 0 ? (nominalGrowth / startEquityVal) * 100 : 0;

  return {
    totalEquity,
    nominalGrowth,
    percentGrowth: Number(percentGrowth.toFixed(2)),
    monthlyData: sortedHistory,
    topMovers,
  };
}
