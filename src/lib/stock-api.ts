/**
 * Stock API utility — fetches IHSG stock data via yahoo-finance2.
 *
 * All Indonesian tickers use the .JK suffix (e.g., "BBCA.JK").
 * This module is SERVER-ONLY — never import it in client components.
 */

import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

// ── Types ──────────────────────────────────────────────────────────────────

export interface StockQuote {
  ticker: string;
  shortName: string | null;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketPreviousClose: number;
  currency: string;
  marketState: string;
  regularMarketTime: number | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Ensure ticker has .JK suffix for Indonesian stocks (skip index tickers like ^JKSE) */
export function toJKTicker(ticker: string): string {
  const upper = ticker.toUpperCase().trim();
  if (upper.startsWith("^")) return upper; // Index tickers don't use .JK
  return upper.endsWith(".JK") ? upper : `${upper}.JK`;
}

/** Strip .JK suffix for display */
export function fromJKTicker(jkTicker: string): string {
  return jkTicker.replace(/\.JK$/i, "");
}

/**
 * Fetch quote for an index ticker (e.g., ^JKSE for IHSG).
 * Index tickers don't use the .JK suffix.
 */
export async function getIndexQuote(symbol: string): Promise<StockQuote> {
  const quote = await yahooFinance.quote(symbol, {
    fields: [
      "symbol",
      "shortName",
      "regularMarketPrice",
      "regularMarketChange",
      "regularMarketChangePercent",
      "regularMarketPreviousClose",
      "currency",
      "marketState",
      "regularMarketTime",
    ],
  });

  return {
    ticker: quote.symbol ?? symbol,
    shortName: quote.shortName ?? null,
    regularMarketPrice: quote.regularMarketPrice ?? 0,
    regularMarketChange: quote.regularMarketChange ?? 0,
    regularMarketChangePercent: quote.regularMarketChangePercent ?? 0,
    regularMarketPreviousClose: quote.regularMarketPreviousClose ?? 0,
    currency: quote.currency ?? "IDR",
    marketState: quote.marketState ?? "CLOSED",
    regularMarketTime: quote.regularMarketTime instanceof Date 
      ? Math.floor(quote.regularMarketTime.getTime() / 1000) 
      : (typeof quote.regularMarketTime === 'number' ? quote.regularMarketTime : null),
  };
}

// ── API Functions ──────────────────────────────────────────────────────────

/**
 * Fetch current quote for a single IHSG ticker.
 *
 * @param ticker - Stock ticker (e.g., "BBCA" or "BBCA.JK")
 * @returns StockQuote with current price and daily change
 */
export async function getStockQuote(ticker: string): Promise<StockQuote> {
  const jkTicker = toJKTicker(ticker);

  const quote = await yahooFinance.quote(jkTicker, {
    fields: [
      "symbol",
      "shortName",
      "regularMarketPrice",
      "regularMarketChange",
      "regularMarketChangePercent",
      "regularMarketPreviousClose",
      "currency",
      "marketState",
      "regularMarketTime",
    ],
  });

  return {
    ticker: fromJKTicker(quote.symbol ?? jkTicker),
    shortName: quote.shortName ?? null,
    regularMarketPrice: quote.regularMarketPrice ?? 0,
    regularMarketChange: quote.regularMarketChange ?? 0,
    regularMarketChangePercent: quote.regularMarketChangePercent ?? 0,
    regularMarketPreviousClose: quote.regularMarketPreviousClose ?? 0,
    currency: quote.currency ?? "IDR",
    marketState: quote.marketState ?? "CLOSED",
    regularMarketTime: quote.regularMarketTime instanceof Date 
      ? Math.floor(quote.regularMarketTime.getTime() / 1000) 
      : (typeof quote.regularMarketTime === 'number' ? quote.regularMarketTime : null),
  };
}

/**
 * Fetch current quotes for multiple IHSG tickers in a single batch.
 *
 * @param tickers - Array of stock tickers (e.g., ["BBCA", "BMRI", "TLKM"])
 * @returns Map of ticker -> StockQuote
 */
export async function getStockQuotes(
  tickers: string[]
): Promise<Map<string, StockQuote>> {
  if (tickers.length === 0) return new Map();

  const jkTickers = tickers.map(toJKTicker);

  const quotes = await yahooFinance.quote(jkTickers, {
    fields: [
      "symbol",
      "shortName",
      "regularMarketPrice",
      "regularMarketChange",
      "regularMarketChangePercent",
      "regularMarketPreviousClose",
      "currency",
      "marketState",
    ],
  });

  const results = new Map<string, StockQuote>();
  const quotesArray = Array.isArray(quotes) ? quotes : [quotes];

  for (const q of quotesArray) {
    const cleanTicker = fromJKTicker(q.symbol ?? "");
    results.set(cleanTicker, {
      ticker: cleanTicker,
      shortName: q.shortName ?? null,
      regularMarketPrice: q.regularMarketPrice ?? 0,
      regularMarketChange: q.regularMarketChange ?? 0,
      regularMarketChangePercent: q.regularMarketChangePercent ?? 0,
      regularMarketPreviousClose: q.regularMarketPreviousClose ?? 0,
      currency: q.currency ?? "IDR",
      marketState: q.marketState ?? "CLOSED",
      regularMarketTime: q.regularMarketTime instanceof Date 
        ? Math.floor(q.regularMarketTime.getTime() / 1000) 
        : (typeof q.regularMarketTime === 'number' ? q.regularMarketTime : null),
    });
  }

  return results;
}

/**
 * Fetch a historical closing price for a ticker on a specific date.
 * Useful for YTD calculations.
 *
 * @param symbol - Ticker symbol (e.g., "^JKSE")
 * @param date - The target date
 * @returns Closing price on that date (or the nearest previous trading day)
 */
export async function getHistoricalPrice(
  symbol: string,
  date: Date
): Promise<number> {
  // We fetch a small range to account for weekends/holidays
  const start = new Date(date);
  start.setDate(start.getDate() - 7); // Go back 7 days to be safe
  
  const end = new Date(date);
  end.setDate(end.getDate() + 1);

  const results = await yahooFinance.historical(symbol, {
    period1: start.toISOString().split("T")[0],
    period2: end.toISOString().split("T")[0],
    interval: "1d",
  });

  if (!results || results.length === 0) return 0;

  // Find the result closest to our target date (but not after it)
  const targetTime = date.getTime();
  const validResults = results
    .filter((r) => new Date(r.date).getTime() <= targetTime)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return validResults[0]?.adjClose ?? validResults[0]?.close ?? 0;
}
