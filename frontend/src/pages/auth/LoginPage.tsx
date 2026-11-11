/**
 * Enterprise sign-in page.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Lock, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const logoSrc = "/images/Logo-logicat-Digital.webp";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading: authLoading } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    try {
      const user = await login(data.email, data.password);
      navigate(user.role === "ADMIN_RH" ? "/admin/dashboard" : "/employee/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Identifiants invalides. Vérifiez votre email et mot de passe.";
      setServerError(typeof msg === "string" ? msg : "La connexion a échoué. Veuillez réessayer.");
    }
  }
  const busy = isSubmitting || authLoading;

  return (
    <main className="grid min-h-screen grid-cols-1 bg-white md:grid-cols-2">
      {/* Desktop brand panel */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#123b9a] via-[#1746b3] to-[#0b1e4b] px-12 py-16 text-white md:flex md:flex-col md:items-center md:justify-center">
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div aria-hidden="true" className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="relative flex max-w-lg flex-col items-center text-center">
          <div className="mb-7 rounded-2xl bg-white px-6 py-4 shadow-2xl shadow-black/20">
            <img src={logoSrc} alt="LOGICAT" className="h-auto w-64 object-contain" />
          </div>
          <p className="text-lg font-medium text-blue-100">Portail de gestion des ressources humaines</p>
          <div className="mt-10 h-px w-20 bg-blue-300/50" />
          <p className="mt-6 text-sm leading-6 text-blue-100/80">Un espace sécurisé pour gérer les présences, les tâches et le suivi des équipes.</p>
        </div>
      </section>

      {/* Sign-in panel */}
      <section className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 sm:px-8 md:min-h-0 md:px-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9">
          <div className="mb-8 flex justify-center md:hidden">
            <img src={logoSrc} alt="LOGICAT" className="h-auto w-44 rounded-xl bg-white p-2 shadow-sm" />
          </div>

          <header className="mb-7">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Espace sécurisé</p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Connexion</h2>
            <p className="mt-2 text-sm text-slate-500">Accédez à votre espace sécurisé.</p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Adresse email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="email" type="email" placeholder="nom@entreprise.ma" autoComplete="email" className="h-11 pl-10" aria-invalid={!!errors.email} {...register("email")} />
              </div>
              {errors.email && <p className="text-xs text-rose-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Mot de passe</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="password" type="password" placeholder="Votre mot de passe" autoComplete="current-password" className="h-11 pl-10" aria-invalid={!!errors.password} {...register("password")} />
              </div>
              {errors.password && <p className="text-xs text-rose-600">{errors.password.message}</p>}
            </div>

            {serverError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{serverError}</div>}

            <Button type="submit" disabled={busy} className="h-11 w-full bg-blue-700 font-semibold text-white shadow-sm shadow-blue-900/15 hover:bg-blue-800">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {busy ? "Connexion…" : "Se connecter"}
              {!busy && <ArrowRight className="ml-auto h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">LOGICAT GROUP · Portail RH interne · Accès réservé</p>
        </div>
      </section>
    </main>
  );
}
