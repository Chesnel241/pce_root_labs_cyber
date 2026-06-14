"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { login, register, apiEnabled } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isRegister = mode === "register";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Mode démo : pas d'API configurée — on accède directement à la plateforme.
    if (!apiEnabled) {
      setLoading(true);
      setTimeout(() => router.push("/dashboard"), 500);
      return;
    }

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const username = String(form.get("username") ?? "").trim();

    setLoading(true);
    try {
      if (isRegister) {
        await register(email, username, password);
      } else {
        await login(email, password);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue. Réessayez.",
      );
      setLoading(false);
    }
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
          required
        />
      )}
      <Field
        label="Adresse e-mail"
        name="email"
        type="email"
        placeholder="vous@entreprise.com"
        autoComplete="email"
        required
      />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        placeholder="••••••••"
        autoComplete={isRegister ? "new-password" : "current-password"}
        required
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

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
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
