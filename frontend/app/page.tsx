import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Flag,
  Gauge,
  Lock,
  ShieldCheck,
  Terminal,
  Trophy,
} from "lucide-react";
import { tracks, totals } from "@/lib/curriculum";
import { accentMeta } from "@/lib/style-maps";
import { trackIcon } from "@/lib/icons";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { formatNumber } from "@/lib/utils";

const features = [
  {
    icon: Terminal,
    title: "Terminal intégré",
    description:
      "Un terminal web connecté à un conteneur isolé pour chaque challenge. Aucune installation requise.",
  },
  {
    icon: Boxes,
    title: "Labs réalistes",
    description:
      "Des environnements cloud volontairement vulnérables, réinitialisés automatiquement après chaque session.",
  },
  {
    icon: Flag,
    title: "Challenges CTF",
    description:
      "Capturez des flags, validez vos acquis et progressez du niveau facile à expert.",
  },
  {
    icon: Trophy,
    title: "Gamification",
    description:
      "XP, badges, classement et progression par paliers pour rester motivé sur la durée.",
  },
  {
    icon: Gauge,
    title: "Suivi de progression",
    description:
      "Un tableau de bord clair pour mesurer votre montée en compétences, parcours par parcours.",
  },
  {
    icon: Lock,
    title: "Offensif & défensif",
    description:
      "Du pentest cloud au SOC : couvrez l'ensemble du spectre de la sécurité cloud.",
  },
];

const steps = [
  { n: "01", title: "Choisissez un parcours", text: "Six spécialisations métier, de la reconnaissance à l'architecture sécurisée." },
  { n: "02", title: "Démarrez un lab", text: "Un conteneur isolé se provisionne en quelques secondes." },
  { n: "03", title: "Capturez le flag", text: "Exploitez la vulnérabilité depuis le terminal et soumettez votre flag." },
  { n: "04", title: "Gagnez de l'XP", text: "Validez vos acquis, débloquez des badges et grimpez au classement." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo href="/" />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              Fonctionnalités
            </a>
            <a href="#tracks" className="hover:text-foreground">
              Parcours
            </a>
            <a href="#how" className="hover:text-foreground">
              Comment ça marche
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Connexion
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm">
                Accéder à la plateforme
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Cyber range cloud — {totals.challenges}+ challenges pratiques
            </span>
            <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Maîtrisez la sécurité cloud,{" "}
              <span className="text-primary">en pratiquant.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
              Une plateforme d&apos;entraînement professionnelle : labs isolés,
              terminal intégré et challenges CTF couvrant le pentest, l&apos;IAM,
              le DevSecOps, Kubernetes et le SOC cloud.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto">
                  Commencer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/tracks">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Explorer les parcours
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            {[
              { value: totals.tracks, label: "Parcours" },
              { value: totals.modules, label: "Modules" },
              { value: `${totals.challenges}+`, label: "Challenges" },
              { value: formatNumber(totals.xp), label: "XP à gagner" },
            ].map((s) => (
              <div key={s.label} className="bg-surface px-6 py-5 text-center">
                <p className="text-2xl font-bold tracking-tight">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight">
            Tout pour monter en compétences
          </h2>
          <p className="mt-3 text-muted-foreground">
            Une expérience pensée comme un produit, pas comme un terminal de
            hacker. Claire, mesurable et orientée résultats.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-surface p-6 shadow-card"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tracks */}
      <section id="tracks" className="border-y border-border bg-surface-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight">
              Six parcours de spécialisation
            </h2>
            <p className="mt-3 text-muted-foreground">
              De l&apos;attaque à la défense, choisissez votre voie et progressez
              à votre rythme.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {tracks.map((track) => {
              const accent = accentMeta[track.accent];
              const Icon = trackIcon(track.icon);
              return (
                <div
                  key={track.id}
                  className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent.tile}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-semibold tracking-tight">
                      {track.name}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {track.subtitle}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{track.modules.length} modules</span>
                    <span aria-hidden>·</span>
                    <span>{formatNumber(track.totalXp)} XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight">
            Le parcours apprenant
          </h2>
          <p className="mt-3 text-muted-foreground">
            Quatre étapes simples, répétées à chaque challenge.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl border border-border bg-surface p-6 shadow-card">
              <span className="font-mono text-sm font-semibold text-primary">
                {s.n}
              </span>
              <h3 className="mt-3 font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-primary px-8 py-12 text-center text-primary-foreground sm:px-12">
          <h2 className="text-balance text-3xl font-bold tracking-tight">
            Prêt à capturer votre premier flag ?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-balance text-primary-foreground/80">
            Rejoignez le cyber range et transformez la théorie en réflexes.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="secondary"
                className="w-full text-foreground sm:w-auto"
              >
                Démarrer maintenant
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-primary-foreground/80">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Sans installation
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Labs isolés
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Suivi de progression
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo href="/" />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PCE Root Labs Cyber. Usage pédagogique.
          </p>
        </div>
      </footer>
    </div>
  );
}
