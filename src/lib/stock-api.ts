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
    });
  }

  return results;
}
