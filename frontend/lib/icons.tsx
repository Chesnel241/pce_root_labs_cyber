import {
  Boxes,
  Building2,
  Crosshair,
  GitBranch,
  KeyRound,
  Radar,
  Shield,
  type LucideIcon,
} from "lucide-react";

/** Map curriculum track icon names to lucide components. */
const registry: Record<string, LucideIcon> = {
  Crosshair,
  KeyRound,
  GitBranch,
  Boxes,
  Radar,
  Building2,
};

export function trackIcon(name: string): LucideIcon {
  return registry[name] ?? Shield;
}
