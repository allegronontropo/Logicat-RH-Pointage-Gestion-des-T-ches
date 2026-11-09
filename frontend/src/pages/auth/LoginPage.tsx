/**
 * src/pages/auth/LoginPage.tsx
 * ----------------------------
 * Split-screen login page.
 * Left: Blue gradient branding panel.
 * Right: Login card with quick-fill demo buttons.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  {
    label: "Admin 1",
    email: "admin1@logicat.ma",
    password: "Admin123!",
    color: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  },
  {
    label: "Admin 2",
    email: "admin2@logicat.ma",
    password: "Admin123!",
    color: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
  },
  {
    label: "Employé",
    email: "ybadri@logicat.eu",
    password: "Emp123!",
    color: "bg-green-100 text-green-800 hover:bg-green-200",
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  function fillDemo(email: string, password: string) {
    setValue("email", email, { shouldValidate: true });
    setValue("password", password, { shouldValidate: true });
    setServerError(null);
  }

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    try {
      const user = await login(data.email, data.password);
      if (user.role === "ADMIN_RH") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/employee/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Identifiants invalides. Vérifiez votre email et mot de passe.";
      setServerError(msg);
    }
  }

  return (
    <div className="flex h-screen">
      {/* ── Left panel: Blue gradient branding ─────────────── */}
      <div className="hidden w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] p-12 lg:flex">
        <Building2 className="mb-6 h-16 w-16 text-white" />
        <h1 className="mb-2 text-4xl font-bold text-white">LOGICAT RH</h1>
        <p className="mb-8 text-center text-lg text-blue-100">
          Application de Gestion des Ressources Humaines
        </p>
        <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
          <ul className="space-y-2 text-sm text-blue-50">
            <li>✓ Pointages &amp; présences en temps réel</li>
            <li>✓ Gestion des tâches et assignations</li>
            <li>✓ Tableaux de bord administratif</li>
            <li>✓ Contrôle d'accès basé sur les rôles</li>
          </ul>
        </div>
      </div>

      {/* ── Right panel: Login card ─────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <Building2 className="h-8 w-8 text-[#1E40AF]" />
            <span className="text-xl font-bold text-[#1E40AF]">LOGICAT RH</span>
          </div>

          <Card className="shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Connexion</CardTitle>
              <CardDescription>
                Entrez vos identifiants pour accéder au portail.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Quick-fill demo buttons */}
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Comptes de démonstration
                </p>
                <div className="flex flex-wrap gap-2">
                  {DEMO_ACCOUNTS.map(({ label, email, password, color }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => fillDemo(email, password)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${color}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Login form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@logicat.eu"
                    autoComplete="email"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-xs text-red-600">{errors.password.message}</p>
                  )}
                </div>

                {serverError && (
                  <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                    {serverError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connexion…
                    </>
                  ) : (
                    "Se connecter"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-gray-400">
            LOGICAT GROUP · Portail RH interne · Accès réservé
          </p>
        </div>
      </div>
    </div>
  );
}
