import { getShopSettings } from "@/actions/settings.actions";
import { buildWaLink } from "@/lib/wa-templates";
import { PublicOrderForm } from "@/components/client/PublicOrderForm";
import { buttonVariants } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicOrderPage() {
  const shop = await getShopSettings();
  const waHelpLink = buildWaLink(
    shop.whatsappNumber,
    `Halo Admin ${shop.shopName}, saya ingin konsultasi pemesanan custom.`
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              {shop.shopName}
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
              Formulir Pemesanan Custom
            </h1>
          </div>
          <a
            href={waHelpLink}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "min-h-11 shrink-0 cursor-pointer sm:min-h-8",
            })}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            <span>Tanya Admin</span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <PublicOrderForm
          shopName={shop.shopName}
          shopWhatsapp={shop.whatsappNumber}
        />
      </main>
    </div>
  );
}
