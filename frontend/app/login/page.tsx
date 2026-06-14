import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Connexion"
      subtitle="Accédez à votre tableau de bord et reprenez l'entraînement."
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
