import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getStockQuotes } from "@/lib/stock-api";

/**
 * GET /api/cron/snapshot
 * Triggered by Vercel Cron to record End-of-Day portfolio states.
 */
export async function GET(request: Request) {
  // 1. Security Check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  try {
    // 2. Identify all active users
    // We get distinct user_ids who have either a cash flow or a transaction record.
    const { data: cashFlowUsers } = await supabase.from("cash_flows").select("user_id");
    const { data: txUsers } = await supabase.from("transactions").select("user_id");

    const allUserIds = new Set<string>();
    cashFlowUsers?.forEach(u => allUserIds.add(u.user_id));
    txUsers?.forEach(u => allUserIds.add(u.user_id));

    const userIds = Array.from(allUserIds);
    console.log(`[Cron] Found ${userIds.length} users to snapshot.`);

    // 3. Process each user
    for (const userId of userIds) {
      try {
        // --- Calculate Cash Balance ---
        const { data: cashFlows } = await supabase
          .from("cash_flows")
          .select("type, amount")
          .eq("user_id", userId);

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

        // --- Calculate Active Holdings ---
        const { data: transactions } = await supabase
          .from("transactions")
          .select("type, ticker, price, lots, fee")
          .eq("user_id", userId)
          .order("transaction_date", { ascending: true });

        const holdingsMap = new Map<string, { lots: number; totalCost: number }>();
        if (transactions) {
          for (const tx of transactions) {
            const current = holdingsMap.get(tx.ticker) || { lots: 0, totalCost: 0 };
            const txLots = Number(tx.lots);
            const txPrice = Number(tx.price);
            const fee = Number(tx.fee);

            if (tx.type === "BUY") {
              current.lots += txLots;
              current.totalCost += txLots * txPrice;
              cashBalance -= (txLots * 100 * txPrice + fee);
            } else if (tx.type === "SELL") {
              if (current.lots > 0) {
                const avgCostPerLot = current.totalCost / current.lots;
                current.totalCost -= txLots * avgCostPerLot;
                current.lots -= txLots;
              }
              cashBalance += (txLots * 100 * txPrice - fee);
            }
            holdingsMap.set(tx.ticker, current);
          }
        }

        const activeHoldings = Array.from(holdingsMap.entries())
          .filter(([_, data]) => data.lots > 0)
          .map(([ticker, data]) => ({ ticker, lots: data.lots }));

        // --- Fetch Prices & Calculate Portfolio Value ---
        let portfolioValue = 0;
        let dailyPnl = 0;

        if (activeHoldings.length > 0) {
          const quotes = await getStockQuotes(activeHoldings.map(h => h.ticker));
          for (const h of activeHoldings) {
            const quote = quotes.get(h.ticker);
            if (quote) {
              const totalShares = h.lots * 100;
              portfolioValue += totalShares * quote.regularMarketPrice;
              dailyPnl += totalShares * quote.regularMarketChange;
            }
          }
        }

        const totalEquity = Math.max(0, cashBalance) + portfolioValue;

        // --- Calculate Daily PnL Percent ---
        const previousSnapshotEquity = totalEquity - dailyPnl;
        const dailyPnlPercent = previousSnapshotEquity > 0 
          ? (dailyPnl / previousSnapshotEquity) * 100 
          : 0;

        // 4. Persistence: Upsert the snapshot
        const { error: upsertError } = await supabase
          .from("portfolio_snapshots")
          .upsert({
            user_id: userId,
            snapshot_date: today,
            total_equity: totalEquity,
            portfolio_value: portfolioValue,
            cash_balance: cashBalance,
            daily_pnl: dailyPnl,
            daily_pnl_pct: dailyPnlPercent,
          }, { 
            onConflict: "user_id, snapshot_date" 
          });

        if (upsertError) {
          console.error(`[Cron] Error upserting snapshot for ${userId}:`, upsertError);
        } else {
          console.log(`[Cron] Snapshot successful for ${userId} on ${today}.`);
        }

      } catch (userError) {
        console.error(`[Cron] Unexpected error processing user ${userId}:`, userError);
      }
    }

    return NextResponse.json({ success: true, processedUsers: userIds.length });
  } catch (error: any) {
    console.error("[Cron] Critical Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
