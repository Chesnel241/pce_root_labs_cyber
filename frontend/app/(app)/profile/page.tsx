import { ProfileView } from "@/lib/live-views";

export const metadata = { title: "Profil" };

export default function ProfilePage() {
  // Vue cliente : baseline démo + données live (badges via /me/badges, avec
  // date d'obtention si fournie ; repli sur les badges de démo hors ligne).
  return <ProfileView />;
}
