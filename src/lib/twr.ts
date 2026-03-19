/**
 * Time-Weighted Return (TWR) Calculator
 *
 * Calculates portfolio performance without being distorted by
 * cash deposits or withdrawals.
 *
 * Sub-period breaks are triggered by:
 * - TOPUP (cash inflow)
 * - WITHDRAWAL (cash outflow)
 * - IPO_ORDER (cash locked for IPO)
 * - IPO_REFUND (cash returned from IPO — NOT a new top-up)
 *
 * DIVIDEND is treated as profit (yield), NOT as a cash inflow.
 */

// ── Types ──────────────────────────────────────────────────────────────────

/** Events that affect TWR sub-period calculation */
export type CashFlowEvent = {
  /** Unique identifier */
  id: string;
  /** Timestamp of the event (must be precise for ordering) */
  date: Date;
  /** Type of cash flow event */
  type: "TOPUP" | "WITHDRAWAL" | "DIVIDEND" | "IPO_ORDER" | "IPO_REFUND";
  /** Absolute amount (always positive) */
  amount: number;
};

/** A snapshot of portfolio value at a point in time */
export interface PortfolioValuation {
  /** Timestamp of valuation */
  date: Date;
  /** Total portfolio equity (portfolio market value + cash balance) */
  totalEquity: number;
}

/** Result of a single sub-period TWR calculation */
export interface SubPeriodReturn {
  /** Start date of the sub-period */
  startDate: Date;
  /** End date of the sub-period */
  endDate: Date;
  /** Starting portfolio value */
  startValue: number;
  /** Ending portfolio value (before the cash flow at endDate) */
  endValue: number;
  /** Cash flow that triggered this sub-period break */
  cashFlowAmount: number;
  /** Return for this sub-period: (endValue / startValue) - 1 */
  periodReturn: number;
}

/** Overall TWR result */
export interface TWRResult {
  /** Geometrically linked total return */
  totalReturn: number;
  /** Total return as a percentage */
  totalReturnPercent: number;
  /** Individual sub-period returns for audit/debugging */
  subPeriods: SubPeriodReturn[];
  /** Annualized return (if period > 1 year) */
  annualizedReturn: number | null;
}

// ── Core Calculation ───────────────────────────────────────────────────────

/**
 * Determine the net external cash flow amount for a given event.
 *
 * - TOPUP: positive inflow
 * - WITHDRAWAL: negative outflow
 * - IPO_ORDER: negative (cash locked, leaves the portfolio)
 * - IPO_REFUND: positive (cash returned, enters the portfolio)
 * - DIVIDEND: zero (treated as internal gain, not external flow)
 */
function getNetCashFlow(event: CashFlowEvent): number {
  switch (event.type) {
    case "TOPUP":
      return event.amount;
    case "WITHDRAWAL":
      return -event.amount;
    case "IPO_ORDER":
      return -event.amount;
    case "IPO_REFUND":
      return event.amount;
    case "DIVIDEND":
      // Dividend is profit — does NOT trigger a sub-period break
      return 0;
    default:
      return 0;
  }
}

/**
 * Check if a cash flow event triggers a sub-period break.
 * DIVIDEND does not break sub-periods.
 */
function isSubPeriodBreak(event: CashFlowEvent): boolean {
  return event.type !== "DIVIDEND";
}

/**
 * Calculate Time-Weighted Return for a portfolio.
 *
 * @param valuations - Array of portfolio valuations sorted by date (ascending).
 *   Must include at least the first and last dates, plus valuations at each
 *   cash flow event date (just BEFORE the cash flow occurs).
 *
 * @param cashFlows - Array of external cash flow events sorted by date (ascending).
 *   Each cash flow must have a corresponding valuation at the same date
 *   (representing the portfolio value just before the cash flow).
 *
 * @returns TWRResult with total return, sub-period breakdown, and annualized return.
 *
 * @example
 * ```ts
 * const result = calculateTWR(
 *   [
 *     { date: new Date("2024-01-01"), totalEquity: 100_000_000 },
 *     { date: new Date("2024-03-01"), totalEquity: 110_000_000 },
 *     { date: new Date("2024-06-01"), totalEquity: 125_000_000 },
 *   ],
 *   [
 *     {
 *       id: "1",
 *       date: new Date("2024-03-01"),
 *       type: "TOPUP",
 *       amount: 50_000_000,
 *     },
 *   ]
 * );
 *
 * console.log(result.totalReturnPercent); // e.g., 13.64%
 * ```
 */
export function calculateTWR(
  valuations: PortfolioValuation[],
  cashFlows: CashFlowEvent[]
): TWRResult {
  if (valuations.length < 2) {
    return {
      totalReturn: 0,
      totalReturnPercent: 0,
      subPeriods: [],
      annualizedReturn: null,
    };
  }

  // Filter only sub-period-breaking cash flows and sort by date
  const breakingFlows = cashFlows
    .filter(isSubPeriodBreak)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Build a map of valuations by date for O(1) lookup
  const valuationMap = new Map<string, number>();
  for (const v of valuations) {
    valuationMap.set(v.date.toISOString().split("T")[0], v.totalEquity);
  }

  const subPeriods: SubPeriodReturn[] = [];
  let currentStartDate = valuations[0].date;
  let currentStartValue = valuations[0].totalEquity;

  for (const flow of breakingFlows) {
    const flowDateKey = flow.date.toISOString().split("T")[0];
    const endValue = valuationMap.get(flowDateKey);

    if (endValue === undefined || currentStartValue === 0) {
      continue; // Skip if we don't have a valuation at this date
    }

    const netFlow = getNetCashFlow(flow);
    const periodReturn = endValue / currentStartValue - 1;

    subPeriods.push({
      startDate: currentStartDate,
      endDate: flow.date,
      startValue: currentStartValue,
      endValue,
      cashFlowAmount: netFlow,
      periodReturn,
    });

    // New sub-period starts with the value after the cash flow
    currentStartValue = endValue + netFlow;
    currentStartDate = flow.date;
  }

  // Final sub-period: from last cash flow to the end
  const lastValuation = valuations[valuations.length - 1];
  if (currentStartValue > 0) {
    const periodReturn = lastValuation.totalEquity / currentStartValue - 1;
    subPeriods.push({
      startDate: currentStartDate,
      endDate: lastValuation.date,
      startValue: currentStartValue,
      endValue: lastValuation.totalEquity,
      cashFlowAmount: 0,
      periodReturn,
    });
  }

  // Geometrically link all sub-period returns
  // TWR = ∏(1 + Ri) - 1
  const totalReturn = subPeriods.reduce(
    (product, sp) => product * (1 + sp.periodReturn),
    1
  ) - 1;

  // Annualize if period > 365 days
  const totalDays =
    (lastValuation.date.getTime() - valuations[0].date.getTime()) /
    (1000 * 60 * 60 * 24);

  const annualizedReturn =
    totalDays >= 365
      ? Math.pow(1 + totalReturn, 365 / totalDays) - 1
      : null;

  return {
    totalReturn,
    totalReturnPercent: totalReturn * 100,
    subPeriods,
    annualizedReturn,
  };
}

// ── Convenience Helpers ────────────────────────────────────────────────────

/**
 * Format a return percentage for display.
 * Positive values get a "+" prefix.
 */
export function formatReturnPercent(value: number, decimals = 2): string {
  const formatted = value.toFixed(decimals);
  return value >= 0 ? `+${formatted}%` : `${formatted}%`;
}

/**
 * Format an IDR amount for display.
 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
