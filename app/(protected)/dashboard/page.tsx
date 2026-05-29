"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-6">
        <p className="text-zinc-700">Carregando sessao...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Dashboard
          </h1>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Sair
          </button>
        </div>

        <p className="mt-2 text-zinc-600">
          Dados carregados a partir de GET /auth/me.
        </p>

        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Usuario autenticado
          </h2>

          <dl className="mt-4 grid gap-3 text-sm text-zinc-700">
            <div>
              <dt className="font-medium">ID</dt>
              <dd>{user.id}</dd>
            </div>
            <div>
              <dt className="font-medium">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt className="font-medium">Nome</dt>
              <dd>{user.name ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium">Email verificado</dt>
              <dd>{user.emailVerified ? "Sim" : "Nao"}</dd>
            </div>
            <div>
              <dt className="font-medium">Criado em</dt>
              <dd>{new Date(user.createdAt).toLocaleString("pt-BR")}</dd>
            </div>
            <div>
              <dt className="font-medium">Provedores vinculados</dt>
              <dd>
                {user.accounts.map((account) => account.provider).join(", ")}
              </dd>
            </div>
          </dl>
        </section>

        <div className="mt-6 text-sm text-zinc-600">
          <Link href="/" className="hover:underline">
            Voltar para inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
