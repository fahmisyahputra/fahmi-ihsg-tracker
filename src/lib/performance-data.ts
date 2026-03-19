/**
 * Performance data fetching and aggregation — server-side only.
 */

import { createClient } from "@/utils/supabase/server";
import { getDashboardData } from "@/lib/dashboard-data";
import { startOfMonth, format, isWithinInterval, startOfYear, subDays } from "date-fns";

export interface MonthlyPerformance {
  month: string;
  realizedPnL: number;
  dividendYield: number;
  ipoPnL: number;
  simulatedEquity: number;
}

export interface PerformanceStats {
  totalEquity: number;
  nominalGrowth: number;
  percentGrowth: number;
  monthlyData: MonthlyPerformance[];
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
    else if (filters.range === "ALL") startDate = new Date(2000, 0, 1);
  }

  // 3. Fetch Realized PnL (Journals)
  const { data: journals } = await supabase
    .from("journals")
    .select("ticker, sell_date, realized_pnl, buy_price, sell_price, lots")
    .eq("user_id", user.id)
    .gte("sell_date", startDate.toISOString())
    .lte("sell_date", endDate.toISOString());

  // 4. Fetch Dividends (Cash Flows)
  const { data: dividends } = await supabase
    .from("cash_flows")
    .select("flow_date, amount")
    .eq("user_id", user.id)
    .eq("type", "DIVIDEND")
    .gte("flow_date", startDate.toISOString())
    .lte("flow_date", endDate.toISOString());

  // 5. Fetch Equity Snapshots (Portfolio Snapshots)
  const { data: snapshots } = await supabase
    .from("portfolio_snapshots")
    .select("snapshot_date, total_equity")
    .eq("user_id", user.id)
    .gte("snapshot_date", startDate.toISOString().split("T")[0])
    .lte("snapshot_date", endDate.toISOString().split("T")[0])
    .order("snapshot_date", { ascending: true });

  // ── Aggregation ─────────────────────────────────────────────────────────────

  // Aggregate Top Movers (All-time or filtered?) - User asked for Top Movers link to journals
  // Usually Top Movers should reflect the selected time range.
  const moversMap = new Map<string, { pnl: number; cost: number }>();
  if (journals) {
    for (const j of journals) {
      const current = moversMap.get(j.ticker) || { pnl: 0, cost: 0 };
      current.pnl += Number(j.realized_pnl);
      // cost = buy_price * lots * 100
      current.cost += Number(j.buy_price) * Number(j.lots) * 100;
      moversMap.set(j.ticker, current);
    }
  }

  const topMovers = Array.from(moversMap.entries()).map(([ticker, data]) => ({
    ticker,
    pnl: data.pnl,
    pnlPercent: data.cost > 0 ? (data.pnl / data.cost) * 100 : 0
  }));

  // Aggregation for Charts (Monthly)
  const monthlyMap = new Map<string, MonthlyPerformance>();

  // Initialize months if it's 6M-1Y range
  // For simplicity, we'll populate the map with found data
  const addToMonthly = (dateStr: string, pnl = 0, div = 0, equity = 0) => {
    const monthKey = format(new Date(dateStr), "MMM");
    const existing = monthlyMap.get(monthKey) || {
      month: monthKey,
      realizedPnL: 0,
      dividendYield: 0,
      ipoPnL: 0,
      simulatedEquity: equity,
    };
    existing.realizedPnL += pnl;
    existing.dividendYield += div;
    if (equity > 0) existing.simulatedEquity = equity;
    monthlyMap.set(monthKey, existing);
  };

  if (journals) journals.forEach(j => addToMonthly(j.sell_date, Number(j.realized_pnl)));
  if (dividends) dividends.forEach(d => addToMonthly(d.flow_date, 0, Number(d.amount)));
  if (snapshots) snapshots.forEach(s => addToMonthly(s.snapshot_date, 0, 0, Number(s.total_equity)));

  // If map is empty, add current or last few months as 0s to avoid blank charts
  if (monthlyMap.size === 0) {
     for (let i = 5; i >= 0; i--) {
       const m = format(subDays(new Date(), i * 30), "MMM");
       monthlyMap.set(m, { month: m, realizedPnL: 0, dividendYield: 0, ipoPnL: 0, simulatedEquity: 0 });
     }
  } else if (monthlyMap.size < 4) {
      // Pad with missing months in range? 
      // Simplified: use sorted entries
  }

  const monthlyData = Array.from(monthlyMap.values());

  // Calculate Growth Metrics
  const totalPnL = (journals?.reduce((sum, j) => sum + Number(j.realized_pnl), 0) || 0);
  const totalDiv = (dividends?.reduce((sum, d) => sum + Number(d.amount), 0) || 0);
  const nominalGrowth = totalPnL + totalDiv;
  
  const startEquity = totalEquity - nominalGrowth;
  const percentGrowth = startEquity > 0 ? (nominalGrowth / startEquity) * 100 : 0;

  return {
    totalEquity,
    nominalGrowth,
    percentGrowth: Number(percentGrowth.toFixed(2)),
    monthlyData,
    topMovers,
  };
}
