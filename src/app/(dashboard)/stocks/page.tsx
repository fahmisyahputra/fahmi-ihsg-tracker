import { Suspense } from "react";
import { getDashboardData } from "@/lib/dashboard-data";
import { StockCard } from "@/components/dashboard/stock-card";
import { MutualFundCard } from "@/components/dashboard/mutual-fund-card";
import { Briefcase, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StocksPage() {
  const data = await getDashboardData();
  const { holdings, mutualFunds } = data;

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Briefcase className="size-5 text-primary" /> Active Portfolio
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your combined view of stocks and mutual funds.
        </p>
      </div>

      {/* Stocks Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-border" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 whitespace-nowrap">
            Equity & Stocks
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Suspense
          fallback={
            <div className="flex flex-col gap-4">
              <div className="h-48 rounded-xl border border-border bg-muted animate-pulse" />
              <div className="h-48 rounded-xl border border-border bg-muted animate-pulse" />
            </div>
          }
        >
          {holdings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border rounded-xl bg-muted/20">
              <p className="text-xs text-muted-foreground italic">No active stock positions</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {holdings.map((holding) => (
                <StockCard key={holding.ticker} holding={holding} />
              ))}
            </div>
          )}
        </Suspense>
      </div>

      {/* Mutual Funds Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-border" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 whitespace-nowrap">
            Mutual Funds (Reksa Dana)
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        {mutualFunds.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border rounded-xl bg-muted/20">
             <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-2">
               <Wallet className="size-5 text-muted-foreground" />
             </div>
             <p className="text-xs text-muted-foreground">
               No mutual funds tracked yet.
             </p>
           </div>
        ) : (
          <div className="flex flex-col gap-4">
            {mutualFunds.map((fund) => (
              <MutualFundCard key={fund.id} fund={fund} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
