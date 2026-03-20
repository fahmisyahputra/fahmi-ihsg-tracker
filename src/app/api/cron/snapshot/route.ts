import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const authHeader = request.headers.get("authorization");

  // Authentication: Check Vercel Auth header OR manual secret query param
  const isAuthorized = 
    secret === process.env.CRON_SECRET || 
    authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isAuthorized) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // 1. Get all users from profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id");

    if (profileError) {
      console.error("[Cron] Profile fetch error:", profileError);
      throw profileError;
    }

    const results = [];
    const today = new Date().toISOString().split("T")[0];

    for (const profile of profiles || []) {
      const userId = profile.id;

      // 2. Check if snapshot already exists for today to avoid duplicates
      const { data: existing } = await supabase
        .from("portfolio_snapshots")
        .select("id")
        .eq("user_id", userId)
        .eq("snapshot_date", today)
        .maybeSingle();

      if (existing) {
        results.push({ userId, status: "skipped", reason: "Already exists today" });
        continue;
      }

      // 3. Calculate total equity using our shared logic
      // We pass the service-role client to bypass RLS
      const dashboard = await getDashboardData(userId, supabase);
      
      // 4. Persistence: Log the end-of-day state
      const { error: insertError } = await supabase
        .from("portfolio_snapshots")
        .insert({
          user_id: userId,
          snapshot_date: today,
          total_equity: dashboard.totalEquity,
          portfolio_value: dashboard.portfolioValue,
          cash_balance: dashboard.cashBalance,
          daily_pnl: dashboard.dailyPnl,
          daily_pnl_pct: dashboard.dailyPnlPercent,
        });

      if (insertError) {
        console.error(`[Cron] Insert error for ${userId}:`, insertError);
        results.push({ userId, status: "error", error: insertError.message });
      } else {
        results.push({ userId, status: "success", equity: dashboard.totalEquity });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      details: results,
    });
  } catch (error: any) {
    console.error("[Cron] Fatal Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
