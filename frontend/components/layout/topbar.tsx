"use client";

import { Bell, Search, Zap } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./logo";
import { currentUser, earnedXp } from "@/lib/demo";
import { formatNumber } from "@/lib/utils";

export function Topbar() {
  const initials = currentUser.username.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur-md sm:px-6">
      <div className="lg:hidden">
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
          {formatNumber(earnedXp())} XP
        </span>

        <ThemeToggle />

        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
        </button>

        <div className="flex items-center gap-2.5 pl-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
            {initials}
          </span>
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-medium">{currentUser.username}</span>
            <span className="text-xs text-muted-foreground">
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
