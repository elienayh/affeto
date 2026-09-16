"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { signUp, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export default function CadastroPage() {
  const [state, formAction] = useFormState(signUp, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="mb-6 font-display text-2xl text-brown-dark">Criar conta</h1>
      <form action={formAction} className="space-y-3">
        <input
          type="text"
          name="full_name"
          placeholder="Nome completo"
          required
          className="w-full rounded-soft border border-brown-dark/15 px-4 py-3 text-sm"
        />
        <input
          type="email"
          name="email"
          placeholder="E-mail"
          required
          className="w-full rounded-soft border border-brown-dark/15 px-4 py-3 text-sm"
        />
        <input
          type="password"
          name="password"
          placeholder="Senha"
          required
          minLength={6}
          className="w-full rounded-soft border border-brown-dark/15 px-4 py-3 text-sm"
        />
        {state?.error && <p className="text-sm text-terracota">{state.error}</p>}
        <Button type="submit" className="w-full">
          Criar conta
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-brown-dark/70">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-terracota underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
