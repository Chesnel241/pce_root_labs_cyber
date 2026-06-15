import { notFound } from "next/navigation";
import { getTrack, tracks } from "@/lib/curriculum";
import { TrackDetailView } from "@/lib/live-views";

export function generateStaticParams() {
  return tracks.map((t) => ({ trackId: t.id }));
}

export function generateMetadata({
  params,
}: {
  params: { trackId: string };
}) {
  const track = getTrack(params.trackId);
  return { title: track?.name ?? "Parcours" };
}

export default function TrackDetailPage({
  params,
}: {
  params: { trackId: string };
}) {
  const track = getTrack(params.trackId);
  if (!track) notFound();

  // La vue cliente fusionne la baseline démo avec les données live :
  // en mode démo rien n'est verrouillé ; en mode live (authentifié), un
  // parcours `locked` affiche un état verrouillé et bloque l'accès aux modules.
  return <TrackDetailView trackId={params.trackId} />;
}
