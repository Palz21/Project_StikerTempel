import Link from "next/link";
import { listRawMaterialsAction } from "@/actions/inventory.actions";
import { getShopSettings } from "@/actions/settings.actions";
import { NewOrderForm } from "@/components/admin/NewOrderForm";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminNewOrderPage() {
  const [materialsResult, shop] = await Promise.all([
    listRawMaterialsAction(),
    getShopSettings(),
  ]);

  const materials = materialsResult.success ? (materialsResult.data ?? []) : [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/admin/orders"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "-ml-2 mb-1 min-h-9 cursor-pointer text-slate-600",
              })}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Daftar Pesanan
            </Link>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Input Order Baru
            </h1>
            <p className="text-sm text-slate-500">
              Catat pesanan pelanggan dari WhatsApp dan terbitkan tautan pelacakan.
            </p>
          </div>
        </header>

        <NewOrderForm
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
