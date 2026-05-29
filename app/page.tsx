"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-6 py-16">
      <section className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          VagoAgenda
        </h1>
        <p className="mt-4 text-zinc-600">
          Frontend conectado ao backend com autenticacao por access token em
          memoria e refresh token em cookie HttpOnly.
        </p>

        <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          {isLoading ? (
            <p>Verificando sessao...</p>
          ) : isAuthenticated ? (
            <p>
              Sessao ativa para <strong>{user?.email}</strong>.
            </p>
          ) : (
            <p>Sem sessao ativa.</p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Ir para dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Fazer login
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
