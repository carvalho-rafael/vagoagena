"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setSessionAccessToken, useAuth } from "@/components/auth-provider";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshMe } = useAuth();
  const [message, setMessage] = useState("Finalizando autenticacao...");

  useEffect(() => {
    let active = true;

    const completeAuth = async () => {
      const accessToken = searchParams.get("accessToken");

      if (accessToken) {
        setSessionAccessToken(accessToken);
      }

      try {
        await refreshMe();
        if (active) {
          router.replace("/dashboard");
        }
      } catch {
        if (active) {
          setMessage(
            "Nao foi possivel validar a sessao. Faca login novamente.",
          );
          router.replace("/login");
        }
      }
    };

    void completeAuth();

    return () => {
      active = false;
    };
  }, [refreshMe, router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-6">
      <p className="text-zinc-700">{message}</p>
    </main>
  );
}
