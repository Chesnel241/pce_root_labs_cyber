"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Search, Zap } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";
import { Logo } from "./logo";
import { currentUser, earnedXp } from "@/lib/demo";
import { useAuth } from "@/lib/auth";
import { useProgress } from "@/lib/use-platform-data";
import { cn, formatNumber } from "@/lib/utils";

export function Topbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const progress = useProgress();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Utilisateur réel quand authentifié, sinon utilisateur de démo.
  const username = user?.username ?? currentUser.username;
  const subtitle = user?.email ?? currentUser.role;
  const initials = username.slice(0, 2).toUpperCase();

  // XP live si disponible, sinon valeur de démo.
  const xp =
    progress.data?.totalXp ?? (isAuthenticated ? user?.xp ?? 0 : earnedXp());

  React.useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  function onLogout() {
    setMenuOpen(false);
    logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-1 lg:hidden">
        <MobileNav />
        <Logo compact />
      </div>

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Rechercher un parcours, un challenge…"
          className="h-9 w-full rounded-lg border border-border bg-surface-muted pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:bg-surface focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <span className="hidden items-center gap-1.5 rounded-lg bg-primary-soft px-2.5 py-1.5 text-sm font-semibold text-primary sm:inline-flex">
          <Zap className="h-4 w-4" />
          {formatNumber(xp)} XP
        </span>

        <ThemeToggle />

        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
        </button>

        <div ref={menuRef} className="relative pl-1">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-lg p-0.5 transition-colors hover:bg-surface-muted"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
              {initials}
            </span>
            <div className="hidden flex-col items-start leading-tight sm:flex">
              <span className="text-sm font-medium">{username}</span>
              <span className="max-w-[12rem] truncate text-xs text-muted-foreground">
                {subtitle}
              </span>
            </div>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className={cn(
                "absolute right-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-card-hover",
              )}
            >
              <div className="border-b border-border px-3 py-2">
                <p className="truncate text-sm font-medium">{username}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {subtitle}
                </p>
              </div>
              <button
                role="menuitem"
                onClick={onLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-muted"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
