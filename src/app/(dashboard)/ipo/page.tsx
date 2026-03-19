import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { IpoView } from "@/components/dashboard/ipo-view";

export const metadata = {
  title: "IPO Orders Tracker",
};

async function getIpoData() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: orders } = await supabase
    .from("ipo_orders")
    .select(
      "id, ticker, status, shares_ordered, price_per_share, locked_amount, shares_allotted, refund_amount, order_date, attachment_url"
    )
    .eq("user_id", user.id)
    .order("order_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return orders || [];
}

export default async function IpoPage() {
  const orders = await getIpoData();

  return (
    <Suspense
      fallback={
        <div className="flex h-40 items-center justify-center animate-pulse">
          <div className="size-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <IpoView orders={orders} />
    </Suspense>
  );
}
