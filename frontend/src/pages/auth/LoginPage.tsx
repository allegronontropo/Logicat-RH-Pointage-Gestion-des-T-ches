/**
 * Responsive LOGICAT sign-in page.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, LockKeyhole, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Veuillez saisir une adresse email valide."),
  password: z.string().min(1, "Veuillez saisir votre mot de passe."),
});

type LoginFormData = z.infer<typeof loginSchema>;
const logoSrc = "/images/Logo-logicat-Digital.webp";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading: authLoading } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const busy = isSubmitting || authLoading;

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    try {
      const user = await login(data.email, data.password);
      navigate(user.role === "ADMIN_RH" ? "/admin/dashboard" : "/employee/dashboard", { replace: true });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setServerError(typeof detail === "string" ? detail : "Connexion impossible. Vérifiez vos identifiants et réessayez.");
    }
  }

  return (
    <main className="login-layout min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* Desktop brand panel */}
      <section className="login-brand-panel relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#0D2462] via-[#123B9A] to-[#1746B3] px-10 py-10 text-white lg:flex lg:flex-col xl:px-16">
        <div aria-hidden="true" className="absolute -right-36 -top-32 h-[34rem] w-[34rem] rounded-full border border-white/[0.08]" />
        <div aria-hidden="true" className="absolute -right-16 -top-12 h-[25rem] w-[25rem] rounded-full border border-white/[0.08]" />
        <div aria-hidden="true" className="absolute -bottom-48 -left-40 h-[38rem] w-[38rem] rounded-full bg-blue-300/[0.08] blur-3xl" />

        <div className="relative z-10 flex items-center">
          <div className="rounded-xl bg-white px-4 py-2.5 shadow-lg shadow-blue-950/20">
            <img src={logoSrc} alt="LOGICAT" className="h-auto w-40 object-contain" />
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-xl pb-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-blue-100">
            <ShieldCheck className="h-4 w-4" />
            Portail RH sécurisé
          </div>
          <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Les équipes et le quotidien, au même endroit.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-blue-100/80">
            Gérez les présences, suivez les tâches et retrouvez les informations de votre équipe dans un espace unique.
          </p>
        </div>

        <p className="relative z-10 text-xs text-blue-100/50">LOGICAT GROUP · Portail interne</p>
      </section>

      {/* Sign-in form */}
      <section className="login-form-panel flex min-h-screen flex-col px-5 py-8 sm:px-10 lg:justify-center lg:px-10 xl:px-16">
        <div className="login-form-inner mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center lg:flex-none">
          <div className="login-mobile-logo mb-10 flex justify-center lg:hidden">
            <img src={logoSrc} alt="LOGICAT" className="h-auto w-44 rounded-xl bg-white p-2" />
          </div>

          <header className="mb-8">
            <p className="mb-2 text-sm font-semibold text-blue-700">Bienvenue</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Connexion</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Accédez à votre espace sécurisé.</p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Adresse email</Label>
              <div className="relative">
                <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@entreprise.ma"
                  autoComplete="username"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="h-12 rounded-xl border-slate-200 pl-10 shadow-sm shadow-slate-900/[0.02] placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
                  {...register("email")}
                />
              </div>
              {errors.email && <p id="email-error" className="text-xs text-rose-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Mot de passe</Label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Saisissez votre mot de passe"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className="h-12 rounded-xl border-slate-200 pl-10 pr-12 shadow-sm shadow-slate-900/[0.02] placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
                  {...register("password")}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((shown) => !shown)}
                  className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p id="password-error" className="text-xs text-rose-600">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700">
                {serverError}
              </div>
            )}

            <Button type="submit" disabled={busy} className="login-submit h-12 w-full rounded-xl bg-[#1746B3] text-sm font-semibold text-white shadow-md shadow-blue-900/15 transition hover:bg-[#123B9A] disabled:cursor-not-allowed disabled:opacity-70">
              {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              {busy ? "Connexion en cours…" : "Se connecter"}
              {!busy && <ArrowRight className="ml-auto h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs text-slate-400">Accès réservé aux collaborateurs autorisés.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
