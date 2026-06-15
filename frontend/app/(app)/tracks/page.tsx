import { TracksView } from "@/lib/live-views";

export const metadata = { title: "Parcours" };

export default function TracksPage() {
  // Vue cliente : baseline démo + données live (verrouillage des parcours quand
  // l'utilisateur est authentifié et que l'API renvoie `locked`).
  return <TracksView />;
}
