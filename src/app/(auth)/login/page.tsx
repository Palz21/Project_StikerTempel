import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-slate-200/70 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Masuk Sistem Internal
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gunakan akun Owner atau Admin untuk mengelola operasional pesanan.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="h-44 animate-pulse rounded-lg bg-slate-100" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
