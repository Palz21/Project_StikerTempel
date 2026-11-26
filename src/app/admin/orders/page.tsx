import Link from "next/link";
import { listOrdersAction } from "@/actions/order.actions";
import { getShopSettings } from "@/actions/settings.actions";
import { OrdersListClient } from "@/components/admin/OrdersListClient";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const [ordersResult, shop] = await Promise.all([
    listOrdersAction(),
    getShopSettings(),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!ordersResult.success) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {ordersResult.error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {/* TODO(anggota-3): `/admin` overview & sidebar layout are provided by Anggota 3. */}
            <Link
              href="/admin"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "-ml-2 mb-1 min-h-9 cursor-pointer text-slate-600",
              })}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Dashboard
            </Link>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Manajemen Pesanan
            </h1>
            <p className="text-sm text-slate-500">
              Kelola antrean pesanan, konfirmasi desain, pembayaran, dan status produksi.
            </p>
          </div>
        </header>

        <OrdersListClient
          orders={ordersResult.data ?? []}
          shopName={shop.shopName}
          bankInfo={shop.bankInfo}
          appUrl={appUrl}
        />
      </div>
    </div>
  );
}
