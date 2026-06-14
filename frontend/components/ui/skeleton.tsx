import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton — placeholder shimmer pour les états de chargement.
 * Réutilisable : appliquer une largeur/hauteur via `className`.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
