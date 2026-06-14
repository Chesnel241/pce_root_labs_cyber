import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { totals } from "@/lib/curriculum";

const points = [
  "Labs cloud isolés, prêts en quelques secondes",
  "Terminal intégré, aucune installation",
  "Suivi de progression et classement",
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative">
          <Logo href="/" className="[&_span]:text-primary-foreground" />
        </div>
        <div className="relative space-y-6">
          <ShieldCheck className="h-10 w-10" />
          <h2 className="text-balance text-3xl font-bold tracking-tight">
            Le cyber range pour passer de la théorie aux réflexes.
          </h2>
          <ul className="space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-primary-foreground/90">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-primary-foreground/70">
          {totals.tracks} parcours · {totals.modules} modules ·{" "}
          {totals.challenges}+ challenges
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo href="/" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
