import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderDetailAction } from "@/actions/order.actions";
import { listRawMaterialsAction } from "@/actions/inventory.actions";
import { getShopSettings } from "@/actions/settings.actions";
import { OrderDetailClient } from "@/components/admin/OrderDetailClient";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [orderResult, materialsResult, shop] = await Promise.all([
    getOrderDetailAction(id),
    listRawMaterialsAction(),
    getShopSettings(),
  ]);

  if (!orderResult.success || !orderResult.data) {
    notFound();
  }

  const materials = materialsResult.success ? (materialsResult.data ?? []) : [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        <div>
          <Link
            href="/admin/orders"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "-ml-2 min-h-9 cursor-pointer text-slate-600",
            })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Daftar Pesanan
          </Link>
        </div>

        <OrderDetailClient
          order={orderResult.data}
          materials={materials.map((m) => ({
            id: m.id,
            name: m.name,
            category: m.category,
            stockQty: m.stockQty,
            unit: m.unit,
          }))}
          shopName={shop.shopName}
          bankInfo={shop.bankInfo}
          appUrl={appUrl}
        />
      </div>
    </div>
  );
}
