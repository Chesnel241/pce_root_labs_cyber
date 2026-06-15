"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  ShieldAlert,
  Trophy,
  User,
  LifeBuoy,
  ShieldHalf,
  Settings2,
  FileText,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

/**
 * Navigation identique à la sidebar (`hidden lg:flex`), exposée sur mobile.
 * Garder cette liste alignée avec `components/layout/sidebar.tsx`.
 */
const nav = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/tracks", label: "Parcours", icon: Layers },
  { href: "/vulnerabilities", label: "Vulnérabilités", icon: ShieldAlert },
  { href: "/reports", label: "Rapport", icon: FileText },
  { href: "/leaderboard", label: "Classement", icon: Trophy },
  { href: "/admin", label: "Administration", icon: ShieldHalf },
  { href: "/profile", label: "Profil", icon: User },
  { href: "/settings", label: "Paramètres", icon: Settings2 },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Fermer automatiquement lors d'un changement de route.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ESC pour fermer + verrou du défilement + focus initial dans le panneau.
  React.useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      // Piège de focus minimal : maintenir le focus dans le panneau.
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus sur le bouton de fermeture à l'ouverture.
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Rendre le focus au déclencheur à la fermeture.
  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 lg:hidden"
        aria-label="Ouvrir le menu de navigation"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Arrière-plan */}
          <button
            type="button"
            aria-label="Fermer le menu"
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-fade-in"
          />

          {/* Panneau */}
          <div
            id="mobile-nav-drawer"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation principale"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-border bg-surface shadow-card-hover"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {nav.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                      active
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border p-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <LifeBuoy className="h-[18px] w-[18px]" />
                Aide &amp; docs
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
