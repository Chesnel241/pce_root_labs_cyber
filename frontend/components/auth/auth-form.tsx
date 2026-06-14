"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const isRegister = mode === "register";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: brancher api.login / api.register puis setToken().
    // En mode démo, on accède directement à la plateforme.
    setTimeout(() => router.push("/dashboard"), 500);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isRegister && (
        <Field
          label="Nom d'utilisateur"
          name="username"
          type="text"
          placeholder="jdupont"
          autoComplete="username"
        />
      )}
      <Field
        label="Adresse e-mail"
        name="email"
        type="email"
        placeholder="vous@entreprise.com"
        autoComplete="email"
      />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        placeholder="••••••••"
        autoComplete={isRegister ? "new-password" : "current-password"}
      />

      {!isRegister && (
        <div className="flex justify-end">
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {isRegister ? "Créer mon compte" : "Se connecter"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? "Déjà un compte ? " : "Pas encore de compte ? "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-primary hover:underline"
        >
          {isRegister ? "Se connecter" : "Créer un compte"}
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        name={name}
        className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-ring/30"
        {...props}
      />
    </label>
  );
}
