/**
 * Dashboard data fetching — server-side only.
 *
 * Fetches portfolio data from Supabase and live stock quotes.
 * Uses mock holdings until real transaction aggregation is built.
 */

import { createClient } from "@/utils/supabase/server";
import { getStockQuotes, getIndexQuote } from "@/lib/stock-api";
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

export interface DashboardData {
  /** Cash balance derived from cash_flows sum */
  cashBalance: number;
  /** Active holdings with live prices */
  holdings: Holding[];
  /** Sum of all holdings at market value */
  portfolioValue: number;
  /** Cash + portfolio market value */
  totalEquity: number;
  /** Sum of daily PnL across all holdings */
  dailyPnl: number;
  /** Daily PnL as percentage of previous equity */
  dailyPnlPercent: number;
  /** YTD TWR (placeholder for now) */
  ytdTwr: number;
  /** IHSG (^JKSE) quote for comparison */
  ihsgQuote: StockQuote | null;
  /** User's greeting name */
  userEmail: string;
}

// ── Data Fetching ──────────────────────────────────────────────────────────

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      cashBalance: 0,
      holdings: [],
      portfolioValue: 0,
      totalEquity: 0,
      dailyPnl: 0,
      dailyPnlPercent: 0,
      ytdTwr: 0,
      ihsgQuote: null,
      userEmail: "Guest",
    };
  }

  // 1. Fetch cash flows
  const { data: cashFlows } = await supabase
    .from("cash_flows")
    .select("type, amount")
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
  let quotesMap = new Map<string, StockQuote>();
  let ihsgQuote: StockQuote | null = null;

  try {
    const promises: Promise<any>[] = [];
    if (holdingTickers.length > 0) {
      promises.push(getStockQuotes(holdingTickers).then((res) => (quotesMap = res)));
    }
    promises.push(getIndexQuote("^JKSE").then((res) => (ihsgQuote = res)).catch(() => null));

    await Promise.all(promises);
  } catch (error) {
    console.error("Failed to fetch stock quotes:", error);
  }

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

  // Calculate portfolio totals
  const portfolioValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  
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

  const totalEquity = Math.max(0, cashBalance) + portfolioValue;

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

  return {
    cashBalance,
    holdings,
    portfolioValue,
    totalEquity,
    dailyPnl,
    dailyPnlPercent,
    ytdTwr: 0, // Will be calculated when snapshots are populated
    ihsgQuote,
    userEmail: user.email ?? "Investor",
  };
}
