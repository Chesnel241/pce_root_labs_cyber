import { type Difficulty } from "@/lib/curriculum";
import { difficultyMeta } from "@/lib/style-maps";
import { Badge } from "./badge";

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const meta = difficultyMeta[difficulty];
  return <Badge className={meta.badge}>{meta.label}</Badge>;
}
