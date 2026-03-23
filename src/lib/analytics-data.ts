/**
 * Advanced trading analytics — server-side only.
 *
 * Queries closed trades from the `journals` table and computes:
 * - Win Rate, Average Win, Average Loss, Risk/Reward Ratio
 * - Top 5 Winners & Losers by summed realized PnL per ticker
 */

import { createClient } from "@/utils/supabase/server";

export interface TickerPnL {
  ticker: string;
  totalPnl: number;
  tradeCount: number;
}

export interface CumulativePnLData {
  date: string;
  realizedPnl: number;
  cumulativePnl: number;
  ticker: string;
}

export interface TradeDurationData {
  ticker: string;
  buyDate: string;
  sellDate: string;
  holdingDays: number;
  pnl: number;
}

export interface AdvancedAnalytics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  riskRewardRatio: number;
  topWinners: TickerPnL[];
  topLosers: TickerPnL[];
  cumulativePnl: CumulativePnLData[];
  tradeDuration: TradeDurationData[];
}

const emptyResult: AdvancedAnalytics = {
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  winRate: 0,
  avgWin: 0,
  avgLoss: 0,
  riskRewardRatio: 0,
  topWinners: [],
  topLosers: [],
  cumulativePnl: [],
  tradeDuration: [],
};

export async function getAdvancedAnalytics(
  dates?: { startDate: Date; endDate: Date },
  assetType: string = "all"
): Promise<AdvancedAnalytics> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return emptyResult;
  
  // Dividends don't have closed trades (buy vs sell) in journals
  if (assetType === "dividends") {
    return emptyResult;
  }

  // Fetch closed trades only (sell_date and realized_pnl must exist)
  // Include trade_type column to reliably distinguish IPO vs REGULAR trades
  let query = supabase
    .from("journals")
    .select("ticker, realized_pnl, buy_date, sell_date, trade_type")
    .eq("user_id", user.id)
    .not("sell_date", "is", null)
    .not("realized_pnl", "is", null);

  // Apply asset type filter directly in the query for efficiency
  if (assetType === "ipo") {
    query = query.eq("trade_type", "IPO");
  } else if (assetType === "stocks") {
    query = query.eq("trade_type", "REGULAR");
  }
  // "all" → no trade_type filter, fetch everything

  if (dates) {
    query = query
      .gte("sell_date", dates.startDate.toISOString())
      .lte("sell_date", dates.endDate.toISOString());
  }

  const { data: filteredTrades, error } = await query;

  if (error || !filteredTrades || filteredTrades.length === 0) {
    return emptyResult;
  }

  // ── 1. Win Rate & Avg Win/Loss ─────────────────────────────────────────

  let winningTradesCount = 0;
  let losingTradesCount = 0;
  let sumWins = 0;
  let sumLosses = 0;

  for (const trade of filteredTrades) {
    const pnl = Number(trade.realized_pnl);
    if (pnl >= 0) {
      winningTradesCount++;
      sumWins += pnl;
    } else {
      losingTradesCount++;
      sumLosses += pnl; // negative
    }
  }

  const totalTrades = filteredTrades.length;
  const winRate = totalTrades > 0 ? (winningTradesCount / totalTrades) * 100 : 0;
  const avgWin = winningTradesCount > 0 ? sumWins / winningTradesCount : 0;
  const avgLoss = losingTradesCount > 0 ? sumLosses / losingTradesCount : 0; // negative
  const riskRewardRatio =
    avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : avgWin > 0 ? Infinity : 0;

  // ── 2. Top Winners & Losers by Ticker ──────────────────────────────────

  const tickerMap = new Map<string, { totalPnl: number; tradeCount: number }>();

  for (const trade of filteredTrades) {
    const ticker = trade.ticker;
    const pnl = Number(trade.realized_pnl);
    const current = tickerMap.get(ticker) || { totalPnl: 0, tradeCount: 0 };
    current.totalPnl += pnl;
    current.tradeCount++;
    tickerMap.set(ticker, current);
  }

  const allTickers: TickerPnL[] = Array.from(tickerMap.entries()).map(
    ([ticker, data]) => ({
      ticker,
      totalPnl: data.totalPnl,
      tradeCount: data.tradeCount,
    })
  );

  // Sort descending for winners, ascending for losers
  const sortedByPnl = [...allTickers].sort((a, b) => b.totalPnl - a.totalPnl);

  const topWinners = sortedByPnl
    .filter((t) => t.totalPnl > 0)
    .slice(0, 5);

  const topLosers = sortedByPnl
    .filter((t) => t.totalPnl < 0)
    .reverse()
    .slice(0, 5);

  // ── 3. Cumulative PnL ──────────────────────────────────────────────────

  // Sort trades chronologically by sell date for the timeline
  const chronologicalTrades = [...filteredTrades].sort(
    (a, b) => new Date(a.sell_date).getTime() - new Date(b.sell_date).getTime()
  );

  let runningTotal = 0;
  const cumulativePnl: CumulativePnLData[] = chronologicalTrades.map((trade) => {
    const pnl = Number(trade.realized_pnl);
    runningTotal += pnl;
    return {
      date: trade.sell_date,
      realizedPnl: pnl,
      cumulativePnl: runningTotal,
      ticker: trade.ticker,
    };
  });

  // ── 4. Trade Duration ────────────────────────────────────────────────────

  const tradeDuration: TradeDurationData[] = filteredTrades.map((trade) => {
    const buyTime = new Date(trade.buy_date).getTime();
    const sellTime = new Date(trade.sell_date).getTime();
    // Default to minimum 1 day if bought and sold on the same day
    let holdingDays = Math.round((sellTime - buyTime) / (1000 * 60 * 60 * 24));
    if (holdingDays < 1) holdingDays = 1;

    return {
      ticker: trade.ticker,
      buyDate: trade.buy_date,
      sellDate: trade.sell_date,
      holdingDays,
      pnl: Number(trade.realized_pnl),
    };
  });

  return {
    totalTrades,
    winningTrades: winningTradesCount,
    losingTrades: losingTradesCount,
    winRate,
    avgWin,
    avgLoss,
    riskRewardRatio,
    topWinners,
    topLosers,
    cumulativePnl,
    tradeDuration,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// IPO Hunter Dashboard — specialized analytics
// ──────────────────────────────────────────────────────────────────────────────

export interface IpoScatterPoint {
  ticker: string;
  allotmentRate: number; // %
  roi: number; // %
  pnl: number;
  allottedValue: number;
}

export interface IpoTradeDetail {
  ticker: string;
  pnl: number;
  allottedRoi: number; // %
  lockedRoi: number; // %
  allottedValue: number;
  lockedAmount: number;
}

export interface UnderwriterTrade {
  ticker: string;
  sellDate: string;
  pnl: number;
  allotmentRate: number; // %
  role: "Sole UW" | "Joint UW";
}

export interface UnderwriterStats {
  name: string;
  totalPnl: number;
  totalTrades: number;
  profitableTrades: number;
  hitRate: number; // %
  avgAllotmentRate: number; // %
  totalSharesOrdered: number;
  totalSharesAllotted: number;
  trades: UnderwriterTrade[];
}

export interface IpoAnalytics {
  totalIpos: number;
  profitableIpos: number;
  hitRate: number; // %
  avgAllotmentRate: number; // %
  totalLockedCapital: number;
  totalAllottedValue: number;
  totalRealizedPnl: number;
  lockedCapitalRoi: number; // %
  allottedCapitalRoi: number; // %
  scatterData: IpoScatterPoint[];
  hallOfFame: IpoTradeDetail[];
  underwriters: UnderwriterStats[];
}

const emptyIpoResult: IpoAnalytics = {
  totalIpos: 0,
  profitableIpos: 0,
  hitRate: 0,
  avgAllotmentRate: 0,
  totalLockedCapital: 0,
  totalAllottedValue: 0,
  totalRealizedPnl: 0,
  lockedCapitalRoi: 0,
  allottedCapitalRoi: 0,
  scatterData: [],
  hallOfFame: [],
  underwriters: [],
};

export async function getIpoAnalytics(
  dates?: { startDate: Date; endDate: Date }
): Promise<IpoAnalytics> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return emptyIpoResult;

  // 1. Fetch ALLOTTED IPO orders (completed IPOs with shares received)
  const { data: ipoOrders, error: ipoErr } = await supabase
    .from("ipo_orders")
    .select("ticker, shares_ordered, shares_allotted, price_per_share, locked_amount, order_date, status, notes")
    .eq("user_id", user.id)
    .eq("status", "ALLOTTED");

  if (ipoErr || !ipoOrders || ipoOrders.length === 0) {
    return emptyIpoResult;
  }

  // 2. Fetch closed IPO trades from journals
  let journalQuery = supabase
    .from("journals")
    .select("ticker, realized_pnl, sell_date, buy_date")
    .eq("user_id", user.id)
    .eq("trade_type", "IPO")
    .not("sell_date", "is", null)
    .not("realized_pnl", "is", null);

  if (dates) {
    journalQuery = journalQuery
      .gte("sell_date", dates.startDate.toISOString())
      .lte("sell_date", dates.endDate.toISOString());
  }

  const { data: ipoJournals, error: jErr } = await journalQuery;

  if (jErr || !ipoJournals || ipoJournals.length === 0) {
    return emptyIpoResult;
  }

  // 3. Build a map of realized PnL and sellDate by ticker from journals
  const pnlByTicker = new Map<string, { pnl: number; sellDate: string }>();
  for (const j of ipoJournals) {
    const current = pnlByTicker.get(j.ticker);
    pnlByTicker.set(j.ticker, {
      pnl: (current?.pnl || 0) + Number(j.realized_pnl),
      sellDate: j.sell_date, // capture sell_date for drill-down reporting
    });
  }

  // 4. Merge: only include IPO orders that have a matching realized journal entry
  let totalLockedCapital = 0;
  let totalAllottedValue = 0;
  let totalRealizedPnl = 0;
  let totalSharesOrdered = 0;
  let totalSharesAllotted = 0;
  let profitableIpos = 0;
  const scatterData: IpoScatterPoint[] = [];
  const hallOfFame: IpoTradeDetail[] = [];
  const processedTickers = new Set<string>();
  
  // Underwriter tracking
  const underwriterMap = new Map<string, {
    totalPnl: number;
    totalTrades: number;
    profitableTrades: number;
    totalSharesOrdered: number;
    totalSharesAllotted: number;
    trades: UnderwriterTrade[];
  }>();

  const ALIAS_MAP: Record<string, string> = {
    "trimegah indonesia (lg)": "Trimegah (LG)",
    "trimegah sekuritas (lg)": "Trimegah (LG)",
    "kgi indonesia (ki)": "KGI (KI)",
    "samuel indonesia (if)": "Samuel (IF)",
    "indo premier (pd)": "Indo Premier (PD)",
  };

  // Helper: clean underwriter string but preserve broker codes like "(LG)"
  function normalizeUnderwriterName(name: string): string {
    let clean = name.trim();
    
    // 1. Force exact spacing before opening parenthesis (e.g. "Lotus(YJ)" -> "Lotus (YJ)")
    clean = clean.replace(/\s*\(\s*/g, ' (');

    // Remove common Indonesian noise words
    clean = clean.replace(/^dan\s+/i, '');    // Leading "dan "
    clean = clean.replace(/\s+dan\s+/i, ' '); // Inline " dan "
    clean = clean.replace(/^pt\s+/i, '');     // "PT "
    clean = clean.replace(/\s+sekuritas\b/i, ''); // " Sekuritas"
    clean = clean.replace(/\s+tbk\b/i, '');       // " Tbk"
    clean = clean.replace(/\s+sekwritas\b/i, ''); // Common typo
    clean = clean.replace(/\s+indonesia\b/i, ''); // " Indonesia"
    
    clean = clean.replace(/\s+/g, ' ').trim();

    // 2. Check Alias Dictionary (case-insensitive check)
    const lowerClean = clean.toLowerCase();
    if (ALIAS_MAP[lowerClean]) {
      return ALIAS_MAP[lowerClean];
    }
    
    return clean;
  }

  // Helper: extract underwriter names from notes, handling multiple (e.g. "Mandiri, BRI")
  function parseUnderwriters(notes: string | null): { names: string[], isJoint: boolean } {
    if (!notes || notes.trim() === "") return { names: ["Unknown"], isJoint: false };
    
    let underwriterString = notes.trim();
    // Try to extract after "-" separator (e.g., "Allotment 4.45% - Trimegah")
    if (notes.includes("-")) {
      const parts = notes.split("-");
      underwriterString = parts[parts.length - 1].trim();
    }
    
    // Split by common separators to handle syndicates
    const separators = /[/,&]/;
    const isJoint = separators.test(underwriterString);
    const names = underwriterString
      .split(separators)
      .map(n => normalizeUnderwriterName(n))
      .filter(n => n.length > 0);
      
    return {
      names: names.length > 0 ? names : ["Unknown"],
      isJoint: names.length > 1 || isJoint
    };
  }

  for (const order of ipoOrders) {
    const tradeData = pnlByTicker.get(order.ticker);
    if (!tradeData) continue;
    
    const pnl = tradeData.pnl;
    const sellDate = tradeData.sellDate;

    if (processedTickers.has(order.ticker)) continue;
    processedTickers.add(order.ticker);

    const sharesOrdered = Number(order.shares_ordered);
    const sharesAllotted = Number(order.shares_allotted);
    const pricePerShare = Number(order.price_per_share);
    const lockedAmount = Number(order.locked_amount);
    const allottedValue = sharesAllotted * pricePerShare;
    const allotmentRate = sharesOrdered > 0 ? (sharesAllotted / sharesOrdered) * 100 : 0;
    const allottedRoi = allottedValue > 0 ? (pnl / allottedValue) * 100 : 0;
    const lockedRoi = lockedAmount > 0 ? (pnl / lockedAmount) * 100 : 0;

    totalLockedCapital += lockedAmount;
    totalAllottedValue += allottedValue;
    totalRealizedPnl += pnl;
    totalSharesOrdered += sharesOrdered;
    totalSharesAllotted += sharesAllotted;

    if (pnl > 0) profitableIpos++;

    scatterData.push({
      ticker: order.ticker,
      allotmentRate: Number(allotmentRate.toFixed(1)),
      roi: Number(allottedRoi.toFixed(1)),
      pnl,
      allottedValue,
    });

    hallOfFame.push({
      ticker: order.ticker,
      pnl,
      allottedRoi: Number(allottedRoi.toFixed(1)),
      lockedRoi: Number(lockedRoi.toFixed(1)),
      allottedValue,
      lockedAmount,
    });

    // Track underwriters (handles syndicates by crediting each participating underwriter)
    const { names: uwNames, isJoint } = parseUnderwriters(order.notes);
    const role = isJoint ? "Joint UW" : "Sole UW";

    for (const uwName of uwNames) {
      const uw = underwriterMap.get(uwName) || {
        totalPnl: 0,
        totalTrades: 0,
        profitableTrades: 0,
        totalSharesOrdered: 0,
        totalSharesAllotted: 0,
        trades: [],
      };
      uw.totalPnl += pnl;
      uw.totalTrades++;
      if (pnl > 0) uw.profitableTrades++;
      uw.totalSharesOrdered += sharesOrdered;
      uw.totalSharesAllotted += sharesAllotted;
      uw.trades.push({
        ticker: order.ticker,
        sellDate,
        pnl,
        allotmentRate: Number(allotmentRate.toFixed(1)),
        role,
      });
      underwriterMap.set(uwName, uw);
    }
  }

  // Sort Hall of Fame by PnL descending
  hallOfFame.sort((a, b) => b.pnl - a.pnl);

  // Build underwriter stats array
  const underwriters: UnderwriterStats[] = Array.from(underwriterMap.entries())
    .map(([name, data]) => ({
      name,
      totalPnl: data.totalPnl,
      totalTrades: data.totalTrades,
      profitableTrades: data.profitableTrades,
      hitRate: data.totalTrades > 0 ? (data.profitableTrades / data.totalTrades) * 100 : 0,
      avgAllotmentRate: data.totalSharesOrdered > 0
        ? (data.totalSharesAllotted / data.totalSharesOrdered) * 100
        : 0,
      totalSharesOrdered: data.totalSharesOrdered,
      totalSharesAllotted: data.totalSharesAllotted,
      trades: data.trades.sort((a, b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()),
    }))
    .sort((a, b) => b.totalPnl - a.totalPnl);

  const totalIpos = processedTickers.size;

  return {
    totalIpos,
    profitableIpos,
    hitRate: totalIpos > 0 ? (profitableIpos / totalIpos) * 100 : 0,
    avgAllotmentRate: totalSharesOrdered > 0
      ? (totalSharesAllotted / totalSharesOrdered) * 100
      : 0,
    totalLockedCapital,
    totalAllottedValue,
    totalRealizedPnl,
    lockedCapitalRoi: totalLockedCapital > 0
      ? (totalRealizedPnl / totalLockedCapital) * 100
      : 0,
    allottedCapitalRoi: totalAllottedValue > 0
      ? (totalRealizedPnl / totalAllottedValue) * 100
      : 0,
    scatterData,
    hallOfFame,
    underwriters,
  };
}
