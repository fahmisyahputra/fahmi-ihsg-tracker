/**
 * Dashboard data fetching — server-side only.
 *
 * Fetches portfolio data from Supabase and live stock quotes.
 * Uses mock holdings until real transaction aggregation is built.
 */

import { createClient } from "@/utils/supabase/server";
import { getStockQuotes, getIndexQuote, getHistoricalPrice } from "./stock-api";
import { xirr } from "./xirr";

export const revalidate = 0;
import type { StockQuote } from "@/lib/stock-api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Holding {
  ticker: string;
  lots: number;
  avgPrice: number;
  /** Current market data (filled from yahoo-finance2) */
  quote: StockQuote | null;
  /** Calculated fields */
  totalShares: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  allocation: number; // percentage of total portfolio
}

export interface MutualFund {
  id: string;
  fund_name: string;
  type: string;
  invested_amount: number;
  current_value: number;
  last_updated: string;
}

export interface DashboardData {
  /** Cash balance derived from cash_flows sum */
  cashBalance: number;
  /** Active holdings with live prices */
  holdings: Holding[];
  /** Manual mutual funds tracking */
  mutualFunds: MutualFund[];
  /** Sum of all holdings at market value */
  portfolioValue: number;
  /** Sum of all mutual funds current value */
  mutualFundsValue: number;
  /** Cash + portfolio market value + mutual funds */
  totalEquity: number;
  /** Sum of daily PnL across all holdings */
  dailyPnl: number;
  /** Daily PnL as percentage of previous equity */
  dailyPnlPercent: number;
  /** YTD TWR (placeholder for now) */
  ytdTwr: number;
  /** YTD MWR (XIRR) */
  ytdMwr: number;
  /** IHSG (^JKSE) quote for comparison */
  ihsgQuote: StockQuote | null;
  /** User's greeting name (from profile or email) */
  userDisplayName: string;
  /** Year-to-Date PnL (Realized + Unrealized + Dividends) */
  ytdPnl: number;
  /** IHSG YTD Return percentage */
  ihsgYtdReturn: number;
  /** ISO timestamp of when the data was fetched or market time */
  lastUpdated: string;
  /** Whether lastUpdated represents actual market time (true) or fetch time fallback (false) */
  isMarketTime: boolean;
  /** Breakdown for TWR calculation */
  startingEquityYTD: number;
  netCashFlowYTD: number;
  /** Breakdown for XIRR calculation */
  xirrCashFlows: { date: string; amount: number; type: string }[];
}

// ── Data Fetching ──────────────────────────────────────────────────────────

export async function getDashboardData(userId?: string, customSupabase?: any): Promise<DashboardData> {
  const supabase = customSupabase || await createClient();

  // Get user: either from param or session
  let user;
  if (userId) {
    const { data: { user: foundUser } } = await supabase.auth.admin.getUserById(userId);
    user = foundUser;
  } else {
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    user = sessionUser;
  }

  if (!user) {
    return {
      cashBalance: 0,
      holdings: [],
      mutualFunds: [],
      portfolioValue: 0,
      mutualFundsValue: 0,
      totalEquity: 0,
      dailyPnl: 0,
      dailyPnlPercent: 0,
      ytdTwr: 0,
      ytdMwr: 0,
      ihsgQuote: null,
      userDisplayName: "Guest",
      ytdPnl: 0,
      ihsgYtdReturn: 0,
      lastUpdated: new Date().toISOString(),
      isMarketTime: false,
      startingEquityYTD: 0,
      netCashFlowYTD: 0,
      xirrCashFlows: [],
    };
  }

  const fetchTime = new Date().toISOString();

  // 0. Fetch profile name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const userDisplayName = profile?.display_name || user.email?.split("@")[0] || "Investor";

  // 1. Fetch cash flows
  const { data: cashFlows } = await supabase
    .from("cash_flows")
    .select("type, amount, flow_date")
    .eq("user_id", user.id);

  let cashBalance = 0;
  if (cashFlows) {
    for (const cf of cashFlows) {
      if (cf.type === "TOPUP" || cf.type === "DIVIDEND") {
        cashBalance += Number(cf.amount);
      } else if (cf.type === "WITHDRAWAL") {
        cashBalance -= Number(cf.amount);
      }
    }
  }

  // 1.5 Fetch pending IPO Orders to lock cash
  const { data: pendingIpo } = await supabase
    .from("ipo_orders")
    .select("locked_amount")
    .eq("user_id", user.id)
    .eq("status", "ORDERED");

  if (pendingIpo) {
    for (const ipo of pendingIpo) {
      cashBalance -= Number(ipo.locked_amount);
    }
  }

  // 2. Fetch transactions to build active portfolio
  const { data: transactions } = await supabase
    .from("transactions")
    .select("type, ticker, price, lots, fee")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: true }); // Must process in order for avg cost

  // Aggregate holdings: track lots and calculate weighted average cost
  const holdingsMap = new Map<string, { lots: number; totalCost: number }>();

  if (transactions) {
    for (const tx of transactions) {
      const current = holdingsMap.get(tx.ticker) || { lots: 0, totalCost: 0 };
      const txLots = Number(tx.lots);
      const txPrice = Number(tx.price);

      if (tx.type === "BUY") {
        current.lots += txLots;
        // Gross cost minus fee (or plus fee, but let's keep it simple: cost is just shares * price for avg price calculation, typical for basic trackers)
        current.totalCost += txLots * txPrice;
      } else if (tx.type === "SELL") {
        // Remove proportional cost
        if (current.lots > 0) {
          const avgCostPerLot = current.totalCost / current.lots;
          current.totalCost -= txLots * avgCostPerLot;
          current.lots -= txLots;
        }
      }

      holdingsMap.set(tx.ticker, current);
    }
  }

  // Filter out closed positions (lots <= 0) and prepare base holdings list
  const activeHoldings = Array.from(holdingsMap.entries())
    .filter(([_, data]) => data.lots > 0)
    .map(([ticker, data]) => ({
      ticker,
      lots: data.lots,
      avgPrice: data.totalCost / data.lots,
    }));

  // 3. Fetch live quotes for active holdings + IHSG index
  const holdingTickers = activeHoldings.map((h) => h.ticker);
  
  const [quotesMap, ihsgQuote] = await Promise.all([
    holdingTickers.length > 0 
      ? getStockQuotes(holdingTickers) 
      : Promise.resolve(new Map<string, StockQuote>()),
    getIndexQuote("^JKSE").catch(() => null as StockQuote | null)
  ]);

  // 4. Build final holdings with calculated fields
  const holdings: Holding[] = activeHoldings.map((h) => {
    const quote = quotesMap.get(h.ticker) ?? null;
    const totalShares = h.lots * 100;
    const currentPrice = quote?.regularMarketPrice ?? h.avgPrice;
    
    const marketValue = totalShares * currentPrice;
    const costBasis = totalShares * h.avgPrice;
    const unrealizedPnl = marketValue - costBasis;
    const unrealizedPnlPercent = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

    return {
      ticker: h.ticker,
      lots: h.lots,
      avgPrice: h.avgPrice,
      quote,
      totalShares,
      marketValue,
      costBasis,
      unrealizedPnl,
      unrealizedPnlPercent,
      allocation: 0, // calculated below
    };
  });

  // 2.5 Fetch Mutual Funds
  const { data: mfData } = await supabase
    .from("mutual_funds")
    .select("*")
    .eq("user_id", user.id);

  const mutualFunds: MutualFund[] = (mfData || []).map((mf: any) => ({
    id: mf.id,
    fund_name: mf.fund_name,
    type: mf.type,
    invested_amount: Number(mf.invested_amount),
    current_value: Number(mf.current_value),
    last_updated: mf.updated_at || mf.created_at,
  }));

  // Calculate portfolio totals
  const portfolioValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const mutualFundsValue = mutualFunds.reduce((sum: number, mf: MutualFund) => sum + Number(mf.current_value), 0);
  
  // Deduct portfolio value from cash balance ? Wait. 
  // In a real system, BUY trades deduct from cash_balance, SELL trades add to it.
  // We need to apply trading cash flows to the cashBalance to be fully accurate.
  if (transactions) {
    for (const tx of transactions) {
      // 1 lot = 100 shares
      const grossValue = Number(tx.lots) * 100 * Number(tx.price);
      const fee = Number(tx.fee);
      
      if (tx.type === "BUY") {
        cashBalance -= (grossValue + fee);
      } else if (tx.type === "SELL") {
        cashBalance += (grossValue - fee);
      }
    }
  }

  const totalEquity = Math.max(0, cashBalance) + portfolioValue + mutualFundsValue;

  // Set allocation percentages
  for (const h of holdings) {
    h.allocation = portfolioValue > 0 ? (h.marketValue / portfolioValue) * 100 : 0;
  }

  // Sort by market value descending
  holdings.sort((a, b) => b.marketValue - a.marketValue);

  // Calculate daily PnL
  const dailyPnl = holdings.reduce((sum, h) => {
    if (!h.quote) return sum;
    return sum + h.totalShares * h.quote.regularMarketChange;
  }, 0);

  const previousEquity = totalEquity - dailyPnl;
  const dailyPnlPercent = previousEquity > 0 ? (dailyPnl / previousEquity) * 100 : 0;

  // Calculate YTD PnL: Realized PnL (from Journals) + Dividends + Current Unrealized PnL
  const currentYearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  
  const { data: ytdJournals } = await supabase
    .from("journals")
    .select("realized_pnl")
    .eq("user_id", user.id)
    .gte("sell_date", currentYearStart);

  const realizedPnlYTD = (ytdJournals || []).reduce((sum: number, j: any) => sum + Number(j.realized_pnl), 0);

  const { data: ytdDividends } = await supabase
    .from("cash_flows")
    .select("amount")
    .eq("user_id", user.id)
    .eq("type", "DIVIDEND")
    .gte("flow_date", currentYearStart);

  const dividendsYTD = (ytdDividends || []).reduce((sum: number, d: any) => sum + Number(d.amount), 0);
  
  const totalUnrealizedPnl = holdings.reduce((sum, h) => sum + h.unrealizedPnl, 0);
  // Add mutual fund unrealized PnL as well
  const mutualFundsUnrealizedPnl = mutualFunds.reduce((sum, mf) => sum + (mf.current_value - mf.invested_amount), 0);
  const ytdPnl = realizedPnlYTD + dividendsYTD + totalUnrealizedPnl + mutualFundsUnrealizedPnl;

  // 5. Calculate YTD TWR (Using oldest snapshot of current year)
  // netCashFlowYTD = sum(TOPUP) - sum(WITHDRAWAL)
  let netCashFlowYTD = 0;
  if (cashFlows) {
    for (const cf of cashFlows) {
      if (new Date(cf.flow_date) >= new Date(currentYearStart)) {
        if (cf.type === "TOPUP") netCashFlowYTD += Number(cf.amount);
        else if (cf.type === "WITHDRAWAL") netCashFlowYTD -= Number(cf.amount);
      }
    }
  }

  // CRITICAL: Fetch the oldest snapshot of the CURRENT YEAR as the starting balance
  const { data: jan1Snapshot } = await supabase
    .from("portfolio_snapshots")
    .select("total_equity")
    .eq("user_id", user.id)
    .gte("created_at", currentYearStart)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // If a snapshot exists, use its total_equity. 
  // Else fallback to back-calculation (Current - PnL - Flows)
  const startingEquityYTD = jan1Snapshot?.total_equity 
    ? Number(jan1Snapshot.total_equity) 
    : (totalEquity - ytdPnl - netCashFlowYTD);

  const ytdTwr = startingEquityYTD > 0 ? (ytdPnl / startingEquityYTD) * 100 : 0;

  // 6. Calculate IHSG YTD Return
  let ihsgYtdReturn = 0;
  if (ihsgQuote) {
    const currentIhsgPrice = ihsgQuote.regularMarketPrice;
    try {
      const jan1st = new Date(new Date().getFullYear(), 0, 1);
      const startOfYearPrice = await getHistoricalPrice("^JKSE", jan1st);
      if (startOfYearPrice > 0) {
        ihsgYtdReturn = ((currentIhsgPrice - startOfYearPrice) / startOfYearPrice) * 100;
      }
    } catch (error) {
      console.error("Failed to fetch IHSG start of year price:", error);
    }
  }
  
  // 6.5 Calculate YTD MWR (XIRR)
  let ytdMwr = 0;
  let xirrCashFlows: { date: string; amount: number; type: string }[] = [];

  if (cashFlows) {
    // 1. Filter cash flows to only YTD
    const ytdCashFlows = cashFlows.filter((cf: any) => new Date(cf.flow_date) >= new Date(currentYearStart));

    // 2. Add Starting Equity as the very first cash flow point for XIRR (Investment at start of year)
    // We treat it like a TOPUP (negative flow) for XIRR calculation
    xirrCashFlows.push({
      date: currentYearStart,
      amount: startingEquityYTD,
      type: "YEAR_START"
    });

    // 3. Add all YTD cash flows
    ytdCashFlows.forEach((cf: any) => {
      xirrCashFlows.push({
        date: cf.flow_date,
        amount: Number(cf.amount),
        type: cf.type
      });
    });
    
    // 4. Map for calculation
    const calculationFlows = xirrCashFlows.map(cf => ({
      date: new Date(cf.date),
      amount: cf.type === "TOPUP" || cf.type === "YEAR_START" ? -cf.amount : cf.amount,
    }));

    // 5. Add current total equity as final positive flow today
    calculationFlows.push({
      date: new Date(),
      amount: totalEquity
    });
    
    ytdMwr = xirr(calculationFlows) * 100;
  }

  // 7. Find latest market timestamp from quotes
  let latestMarketTime: number | null = null;
  
  if (ihsgQuote?.regularMarketTime) {
    latestMarketTime = ihsgQuote.regularMarketTime;
  }
  
  for (const h of holdings) {
    if (h.quote?.regularMarketTime) {
      if (latestMarketTime === null || h.quote.regularMarketTime > latestMarketTime) {
        latestMarketTime = h.quote.regularMarketTime;
      }
    }
  }

  const isMarketTime = latestMarketTime !== null;
  const lastUpdated = latestMarketTime !== null 
    ? new Date(latestMarketTime * 1000).toISOString() 
    : fetchTime;

  return {
    cashBalance,
    holdings,
    mutualFunds,
    portfolioValue,
    mutualFundsValue,
    totalEquity,
    dailyPnl,
    dailyPnlPercent,
    ytdTwr, 
    ytdMwr: Number(ytdMwr.toFixed(2)),
    ihsgQuote,
    userDisplayName,
    ytdPnl,
    ihsgYtdReturn,
    lastUpdated,
    isMarketTime,
    startingEquityYTD,
    netCashFlowYTD,
    xirrCashFlows: xirrCashFlows.map(f => ({ date: f.date, amount: f.amount, type: f.type })),
  };
}
