/**
 * Performance data fetching and aggregation — server-side only.
 *
 * STEP 41 REWRITE:
 * - Removed circular getDashboardData() dependency
 * - Uses calculatePerformance for ALL ranges (not just YTD)
 * - Fetches totalEquity directly from latest snapshot + live stock prices
 */

import { createClient } from "@/utils/supabase/server";
import { format, startOfYear, differenceInDays } from "date-fns";
import { getStartDateForTimeframe } from "@/utils/date-filters";
import { calculatePerformance } from "./performance-utils";
import { getStockQuotes } from "./stock-api";
import type { StockQuote } from "./stock-api";

export const revalidate = 0;

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
  twr: number;
  xirr: number;
  monthlyData: TimelineData[];
  topMovers: { ticker: string; pnl: number; pnlPercent: number }[];
}

export async function getPerformanceData(filters: {
  year: string;
  range: string;
  customRange?: { from: Date; to: Date };
}): Promise<PerformanceStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const emptyResult: PerformanceStats = {
    totalEquity: 0,
    nominalGrowth: 0,
    percentGrowth: 0,
    twr: 0,
    xirr: 0,
    monthlyData: [],
    topMovers: [],
  };

  if (!user) return emptyResult;

  // ── 1. Calculate Live Total Equity (without getDashboardData) ──────────

  // Fetch latest snapshot for cash balance
  const { data: latestSnapshot } = await supabase
    .from("portfolio_snapshots")
    .select("cash_balance")
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const cashBalance = latestSnapshot?.cash_balance ? Number(latestSnapshot.cash_balance) : 0;

  // Fetch transactions to build active portfolio
  const { data: transactions } = await supabase
    .from("transactions")
    .select("type, ticker, price, lots, fee")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: true });

  // Aggregate holdings
  const holdingsMap = new Map<string, { lots: number; totalCost: number }>();
  if (transactions) {
    for (const tx of transactions) {
      const current = holdingsMap.get(tx.ticker) || { lots: 0, totalCost: 0 };
      const txLots = Number(tx.lots);
      const txPrice = Number(tx.price);
      if (tx.type === "BUY") {
        current.lots += txLots;
        current.totalCost += txLots * txPrice;
      } else if (tx.type === "SELL") {
        if (current.lots > 0) {
          const avgCostPerLot = current.totalCost / current.lots;
          current.totalCost -= txLots * avgCostPerLot;
          current.lots -= txLots;
        }
      }
      holdingsMap.set(tx.ticker, current);
    }
  }

  const activeTickers = Array.from(holdingsMap.entries())
    .filter(([_, d]) => d.lots > 0)
    .map(([ticker, d]) => ({ ticker, lots: d.lots }));

  // Fetch live quotes
  const quotesMap = activeTickers.length > 0
    ? await getStockQuotes(activeTickers.map(h => h.ticker))
    : new Map<string, StockQuote>();

  // Calculate portfolio value
  let portfolioValue = 0;
  for (const h of activeTickers) {
    const quote = quotesMap.get(h.ticker);
    const price = quote?.regularMarketPrice ?? 0;
    portfolioValue += h.lots * 100 * price;
  }

  const totalEquity = Math.max(0, cashBalance) + portfolioValue;

  // ── 2. Determine Date Range ────────────────────────────────────────────

  const currentYear = new Date().getFullYear().toString();
  let startDate = startOfYear(new Date());
  let endDate = new Date();

  if (filters.year === "custom" && filters.customRange) {
    startDate = filters.customRange.from;
    endDate = filters.customRange.to;
  } else if (filters.year !== "custom" && filters.year !== "this_year" && filters.year !== currentYear) {
    const y = parseInt(filters.year);
    startDate = new Date(y, 0, 1);
    endDate = new Date(y, 11, 31, 23, 59, 59);
  } else {
    startDate = getStartDateForTimeframe(filters.range);
    if (filters.range === "ALL") {
      startDate = new Date(2010, 0, 1);
    }
  }

  // ── 3. Determine Granularity ───────────────────────────────────────────

  const daysDiff = differenceInDays(endDate, startDate);
  const useDaily = daysDiff <= 45;

  // ── 4. Fetch Timeline Data ─────────────────────────────────────────────

  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  const [journalsRes, cashFlowsRes, snapshotsRes] = await Promise.all([
    supabase
      .from("journals")
      .select("ticker, sell_date, realized_pnl, buy_price, sell_price, lots, trade_type")
      .eq("user_id", user.id)
      .gte("sell_date", startDate.toISOString())
      .lte("sell_date", endDate.toISOString()),
    supabase
      .from("cash_flows")
      .select("flow_date, amount, type")
      .eq("user_id", user.id)
      .order("flow_date", { ascending: true }),
    supabase
      .from("portfolio_snapshots")
      .select("snapshot_date, total_equity")
      .eq("user_id", user.id)
      .gte("snapshot_date", startDateStr)
      .lte("snapshot_date", endDateStr)
      .order("snapshot_date", { ascending: true }),
  ]);

  const journals = journalsRes.data;
  const cashFlows = cashFlowsRes.data;
  const snapshots = snapshotsRes.data;

  // Filter dividends for timeline
  const dividends = cashFlows?.filter(cf => cf.type === "DIVIDEND" &&
    new Date(cf.flow_date) >= startDate && new Date(cf.flow_date) <= endDate) || [];

  // ── 5. Aggregate Top Movers ────────────────────────────────────────────

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
    pnlPercent: data.cost > 0 ? (data.pnl / data.cost) * 100 : 0,
  }));

  // ── 6. Timeline Aggregation ────────────────────────────────────────────

  const timelineMap = new Map<string, TimelineData>();

  const addToTimeline = (date: Date, pnl = 0, div = 0, equity = 0) => {
    const label = useDaily ? format(date, "d MMM") : format(date, "MMM yyyy");
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

  if (journals) {
    journals.forEach(j => {
      const pnl = Number(j.realized_pnl);
      if (j.trade_type === "IPO") {
        // Route IPO trades to ipoPnL
        const label = useDaily ? format(new Date(j.sell_date), "d MMM") : format(new Date(j.sell_date), "MMM yyyy");
        const sortKey = useDaily ? format(new Date(j.sell_date), "yyyy-MM-dd") : format(new Date(j.sell_date), "yyyy-MM");
        const existing = timelineMap.get(sortKey) || {
          label,
          realizedPnL: 0,
          dividendYield: 0,
          ipoPnL: 0,
          simulatedEquity: 0,
        };
        existing.ipoPnL += pnl;
        timelineMap.set(sortKey, existing);
      } else {
        addToTimeline(new Date(j.sell_date), pnl);
      }
    });
  }
  if (dividends) dividends.forEach(d => addToTimeline(new Date(d.flow_date), 0, Number(d.amount)));
  if (snapshots) snapshots.forEach(s => addToTimeline(new Date(s.snapshot_date), 0, 0, Number(s.total_equity)));

  // Inject live point for today
  const todayKey = useDaily ? format(new Date(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM");
  if (!timelineMap.has(todayKey)) {
    addToTimeline(new Date(), 0, 0, totalEquity);
  }

  const sortedHistory = Array.from(timelineMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([_, data]) => data);

  // ── 7. Performance Metrics (Using Shared Utility for ALL Ranges) ───────

  const perfResult = await calculatePerformance(
    user.id,
    supabase,
    totalEquity,
    startDate,
    endDate
  );

  return {
    totalEquity,
    nominalGrowth: perfResult.nominalGrowth,
    percentGrowth: Number(perfResult.percentGrowth.toFixed(2)),
    twr: Number(perfResult.twr.toFixed(2)),
    xirr: Number(perfResult.mwr.toFixed(2)),
    monthlyData: sortedHistory,
    topMovers,
  };
}
