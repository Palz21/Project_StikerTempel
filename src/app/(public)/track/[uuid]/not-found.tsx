import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function TrackOrderNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          404
        </p>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">
          Tautan Pesanan Tidak Ditemukan
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Pastikan tautan pelacakan yang Anda buka sudah benar dan lengkap dari
          admin workshop.
        </p>
        <div className="mt-6">
          <Link
            href="/order"
            className={buttonVariants({
              className: "min-h-11 w-full cursor-pointer sm:min-h-9",
            })}
          >
            Buat Pesanan Baru
          </Link>
        </div>
      </div>
    </main>
  );
}
