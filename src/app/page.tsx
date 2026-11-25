import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200/70 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          StikerTempel Operational System
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Manajemen Pre-Order, Produksi, Inventori, dan Arus Kas UMKM Percetakan
          Kemasan Custom &amp; Sablon DTF.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Masuk Dashboard Admin
          </Link>
          <Link
            href="/order"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
          >
            Form Pemesanan Client
          </Link>
        </div>
      </div>
    </main>
  );
}
