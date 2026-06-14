import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Créer un compte" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Quelques secondes suffisent pour démarrer votre premier lab."
    >
      <AuthForm mode="register" />
    </AuthShell>
  );
}
