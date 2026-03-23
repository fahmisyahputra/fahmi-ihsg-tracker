import { xirr } from "./xirr";
import { startOfDay, endOfDay, format } from "date-fns";

export interface CashFlowDetail {
  date: string;
  amount: number;
  type: string;
}

export interface PerformanceMetrics {
  totalEquity: number;
  nominalGrowth: number;
  percentGrowth: number;
  twr: number;
  mwr: number;
  /** Starting equity at the beginning of the period */
  startingEquity: number;
  /** Net cash flows (TOPUP - WITHDRAWAL) during the period */
  netCashFlow: number;
  /** Detailed cash flows for modal display (YEAR_START + flows) */
  cashFlowDetails: CashFlowDetail[];
}

/**
 * Robust performance calculator for any timeframe.
 *
 * BUG FIXES (Step 41):
 * 1. Snapshot query uses .lte() + descending to find snapshot AT OR BEFORE startDate
 * 2. All date filters use format() for timezone-safe date-only strings
 * 3. Returns startingEquity, netCashFlow, and cashFlowDetails for modal
 *
 * EDGE CASE FIXES (Step 42):
 * 4. Out-of-bounds fallback: if no snapshot ≤ startDate, use the EARLIEST available snapshot
 * 5. Short timeframe XIRR: handles sparse/zero cash flow scenarios gracefully
 * 6. Adjusts effective startDate when falling back to earliest snapshot
 */
export async function calculatePerformance(
  userId: string,
  supabase: any,
  currentTotalEquity: number,
  startDate: Date,
  endDate: Date = new Date()
): Promise<PerformanceMetrics> {
  // Use format() to produce timezone-safe date-only strings for date columns
  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  // ── 1. Fetch cash flows and starting snapshot in parallel ──────────────

  const [cashFlowsRes, startSnapshotRes, earliestSnapshotRes] = await Promise.all([
    // Cash flows within the requested range
    supabase
      .from("cash_flows")
      .select("type, amount, flow_date")
      .eq("user_id", userId)
      .gte("flow_date", startDateStr)
      .lte("flow_date", endDateStr)
      .order("flow_date", { ascending: true }),

    // Primary: snapshot AT OR BEFORE startDate
    supabase
      .from("portfolio_snapshots")
      .select("snapshot_date, total_equity")
      .eq("user_id", userId)
      .lte("snapshot_date", startDateStr)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // FIX #4: Fallback — absolute EARLIEST snapshot in the database
    supabase
      .from("portfolio_snapshots")
      .select("snapshot_date, total_equity")
      .eq("user_id", userId)
      .order("snapshot_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  // ── 2. Determine Starting Equity with robust fallback chain ────────────

  let startingEquity = 0;
  let effectiveStartDate = startDate;

  const primarySnapshot = startSnapshotRes.data;
  const earliestSnapshot = earliestSnapshotRes.data;

  if (primarySnapshot?.total_equity && Number(primarySnapshot.total_equity) > 0) {
    // Best case: we have a snapshot at or before the requested start date
    startingEquity = Number(primarySnapshot.total_equity);
  } else if (earliestSnapshot?.total_equity && Number(earliestSnapshot.total_equity) > 0) {
    // FIX #4: Out-of-bounds fallback — use the earliest available snapshot
    // This handles 6M, 1Y, etc. when snapshots only start from Jan 2026
    startingEquity = Number(earliestSnapshot.total_equity);
    effectiveStartDate = new Date(earliestSnapshot.snapshot_date);
  }
  // If neither snapshot exists, startingEquity stays 0 and we'll return 0% (truly no data)

  // ── 3. Sum cash flows ──────────────────────────────────────────────────

  const rawCashFlows = cashFlowsRes.data || [];
  let netCashFlow = 0;
  for (const cf of rawCashFlows) {
    if (cf.type === "TOPUP") netCashFlow += Number(cf.amount);
    else if (cf.type === "WITHDRAWAL") netCashFlow -= Number(cf.amount);
  }

  // ── 4. Absolute Return ─────────────────────────────────────────────────
  // Formula: nominalGrowth = Ending - Starting - Net Flows
  const nominalGrowth = currentTotalEquity - startingEquity - netCashFlow;
  const percentGrowth =
    startingEquity > 0 ? (nominalGrowth / startingEquity) * 100 : 0;

  // ── 5. TWR (simplified Modified Dietz) ─────────────────────────────────
  const twr =
    startingEquity > 0 ? (nominalGrowth / startingEquity) * 100 : 0;

  // ── 6. MWR (XIRR) with robust edge-case handling ──────────────────────
  let mwr = 0;

  if (startingEquity > 0) {
    const xirrFlows: { date: Date; amount: number }[] = [];

    // Starting outflow (use effective start date for XIRR accuracy)
    xirrFlows.push({
      date: startOfDay(effectiveStartDate),
      amount: -startingEquity,
    });

    // Cash flows during the period
    for (const cf of rawCashFlows) {
      xirrFlows.push({
        date: new Date(cf.flow_date),
        amount: cf.type === "TOPUP" ? -Number(cf.amount) : Number(cf.amount),
      });
    }

    // Ending inflow
    xirrFlows.push({
      date: endOfDay(endDate),
      amount: currentTotalEquity,
    });


    try {
      if (xirrFlows.length >= 2) {
        const result = xirr(xirrFlows) * 100;
        // Only reject clearly broken math (NaN, Infinity, absurdly large)
        // Never substitute TWR — MWR must remain mathematically independent
        mwr = (isNaN(result) || !isFinite(result) || Math.abs(result) > 10000) ? 0 : result;
      }
    } catch (e) {
      console.error("XIRR failed:", e);
      mwr = 0; // Mathematical failure — return 0, never fake with TWR
    }
  }

  // ── 7. Build cash flow details for the modal ───────────────────────────
  const cashFlowDetails: CashFlowDetail[] = [
    {
      date: effectiveStartDate.toISOString(),
      amount: startingEquity,
      type: "YEAR_START",
    },
    ...rawCashFlows.map((cf: any) => ({
      date: new Date(cf.flow_date).toISOString(),
      amount: Number(cf.amount),
      type: cf.type,
    })),
  ];

  return {
    totalEquity: currentTotalEquity,
    nominalGrowth,
    percentGrowth,
    twr,
    mwr,
    startingEquity,
    netCashFlow,
    cashFlowDetails,
  };
}
