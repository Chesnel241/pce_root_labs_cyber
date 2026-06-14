"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  User,
  Palette,
  Bell,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { currentUser } from "@/lib/demo";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TabId = "profil" | "apparence" | "notifications" | "securite";

const tabs: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "profil", label: "Profil", icon: User },
  { id: "apparence", label: "Apparence", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "securite", label: "Sécurité", icon: ShieldCheck },
];

export default function SettingsPage() {
  const [tab, setTab] = React.useState<TabId>("profil");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        description="Gérez votre profil, l'apparence de l'interface, les notifications et la sécurité de votre compte."
      />

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* Onglets */}
        <nav
          aria-label="Sections des paramètres"
          className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Contenu */}
        <div>
          {tab === "profil" && <ProfilSection />}
          {tab === "apparence" && <ApparenceSection />}
          {tab === "notifications" && <NotificationsSection />}
          {tab === "securite" && <SecuriteSection />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-surface-muted px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:bg-surface focus:ring-2 focus:ring-ring/30";

function ProfilSection() {
  const { user } = useAuth();
  const username = user?.username ?? currentUser.username;
  const email = user?.email ?? currentUser.email;

  return (
    <SectionShell
      title="Profil"
      description="Ces informations apparaissent sur votre profil public et le classement."
    >
      <form
        className="space-y-5"
        onSubmit={(e) => e.preventDefault()}
        aria-describedby="profil-demo-note"
      >
        <Field label="Nom d'utilisateur" htmlFor="username">
          <input
            id="username"
            name="username"
            type="text"
            defaultValue={username}
            className={inputClass}
            autoComplete="username"
          />
        </Field>
        <Field
          label="Adresse email"
          htmlFor="email"
          hint="Utilisée pour la connexion et les notifications."
        >
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={email}
            className={inputClass}
            autoComplete="email"
          />
        </Field>
        <Field label="Rôle" htmlFor="role">
          <input
            id="role"
            name="role"
            type="text"
            defaultValue={currentUser.role}
            className={inputClass}
          />
        </Field>
        <div className="flex items-center justify-between border-t border-border pt-5">
          <p id="profil-demo-note" className="text-xs text-muted-foreground">
            Démonstration — les modifications ne sont pas enregistrées.
          </p>
          <Button type="submit">Enregistrer</Button>
        </div>
      </form>
    </SectionShell>
  );
}

function ApparenceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const options = [
    { value: "light", label: "Clair", icon: Sun },
    { value: "dark", label: "Sombre", icon: Moon },
    { value: "system", label: "Système", icon: Monitor },
  ] as const;

  const current = mounted ? theme ?? "system" : undefined;

  return (
    <SectionShell
      title="Apparence"
      description="Choisissez le thème de l'interface. « Système » suit les réglages de votre appareil."
    >
      <fieldset>
        <legend className="sr-only">Thème de l&apos;interface</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map((opt) => {
            const Icon = opt.icon;
            const active = current === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                  active
                    ? "border-primary/40 bg-primary-soft text-primary"
                    : "border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {opt.label}
                {active && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </fieldset>
    </SectionShell>
  );
}

const notifications = [
  {
    id: "notif-solved",
    label: "Challenges résolus",
    description: "Recevoir une confirmation à chaque challenge validé.",
    defaultChecked: true,
  },
  {
    id: "notif-badges",
    label: "Badges débloqués",
    description: "Être notifié lorsqu'un nouveau badge est obtenu.",
    defaultChecked: true,
  },
  {
    id: "notif-leaderboard",
    label: "Mises à jour du classement",
    description: "Suivre les changements de votre rang.",
    defaultChecked: false,
  },
  {
    id: "notif-product",
    label: "Annonces produit",
    description: "Nouveaux parcours, labs et fonctionnalités.",
    defaultChecked: false,
  },
];

function NotificationsSection() {
  return (
    <SectionShell
      title="Notifications"
      description="Choisissez les événements qui déclenchent une notification."
    >
      <ul className="divide-y divide-border">
        {notifications.map((n) => (
          <li
            key={n.id}
            className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
          >
            <label htmlFor={n.id} className="cursor-pointer">
              <span className="block text-sm font-medium">{n.label}</span>
              <span className="block text-xs text-muted-foreground">
                {n.description}
              </span>
            </label>
            <Toggle id={n.id} defaultChecked={n.defaultChecked} />
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

function Toggle({
  id,
  defaultChecked,
}: {
  id: string;
  defaultChecked?: boolean;
}) {
  const [on, setOn] = React.useState(Boolean(defaultChecked));
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
        on ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-surface shadow-sm transition-transform",
          on ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function SecuriteSection() {
  return (
    <SectionShell
      title="Sécurité"
      description="Mettez à jour votre mot de passe régulièrement pour protéger votre compte."
    >
      <form
        className="max-w-md space-y-5"
        onSubmit={(e) => e.preventDefault()}
        aria-describedby="securite-demo-note"
      >
        <Field label="Mot de passe actuel" htmlFor="current-password">
          <input
            id="current-password"
            name="current-password"
            type="password"
            className={inputClass}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </Field>
        <Field
          label="Nouveau mot de passe"
          htmlFor="new-password"
          hint="Au moins 12 caractères, avec chiffres et symboles."
        >
          <input
            id="new-password"
            name="new-password"
            type="password"
            className={inputClass}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>
        <Field label="Confirmer le mot de passe" htmlFor="confirm-password">
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            className={inputClass}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>
        <div className="flex items-center justify-between border-t border-border pt-5">
          <p id="securite-demo-note" className="text-xs text-muted-foreground">
            Démonstration — le mot de passe n&apos;est pas réellement modifié.
          </p>
          <Button type="submit">Mettre à jour</Button>
        </div>
      </form>
    </SectionShell>
  );
}
