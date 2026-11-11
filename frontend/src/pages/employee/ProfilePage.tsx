/**
 * src/pages/employee/ProfilePage.tsx
 * ------------------------------------
 * Employee Profile — read-only view.
 *
 * All /api/users/* endpoints are admin-only (Depends(require_admin)).
 * Employees cannot edit their own profile via API.
 * We display the info stored in AuthContext (from login response)
 * and show a contact-admin note for any changes.
 */

import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  ShieldCheck,
  Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/auth/useAuth";
import { apiClient } from "@/api/client";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-slate-100 last:border-b-0">
      <div className="shrink-0 mt-0.5 h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <div className="text-sm font-medium text-slate-900 break-words">{value}</div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function EmployeeProfilePage() {
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        Chargement du profil…
      </div>
    );
  }

  const ep = user.employee_profile;
  const fullName = `${user.first_name} ${user.last_name}`;
  const initials = `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase();

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const payload: { phone: string; password?: string } = { phone: phone.trim() };
    if (password) payload.password = password;
    try {
      const response = await apiClient.patch("/api/employees/me/profile", payload);
      const updatedUser = { ...user, ...response.data };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setPhone(updatedUser.phone ?? "");
      setPassword("");
      setEditOpen(false);
      setSuccess("Votre profil a été mis à jour.");
    } catch (requestError: any) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "La mise à jour du profil a échoué.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* ── Avatar / Name card ──────────────────────────────────────────── */}
      <Card className="border-0 bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg">
        <CardContent className="p-6 flex items-center gap-5">
          {/* Avatar */}
          <div className="shrink-0 h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold text-white border border-white/30">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold leading-tight truncate">{fullName}</h2>
            <p className="text-blue-200 text-sm mt-0.5 truncate">{ep?.position ?? "Employé"}</p>
            {/* Role badge */}
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white border border-white/20">
              <ShieldCheck className="h-3 w-3" />
              {user.role === "ADMIN_RH" ? "Administrateur RH" : "Employé"}
            </div>
          </div>
        </CardContent>
      </Card>

      {success && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      {/* ── Profile details ─────────────────────────────────────────────── */}
      <Card className="border-slate-200">
        <CardContent className="p-0 divide-y divide-slate-100">
          <div className="flex justify-end px-5 pt-4">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { setPhone(user.phone ?? ""); setSuccess(""); setEditOpen(true); }}><Pencil className="h-4 w-4" /> Modifier mon profil</Button>
          </div>
          {/* Wrap rows inside the card padding */}
          <div className="px-5">
            <ProfileRow
              icon={<User className="h-4 w-4" />}
              label="Nom complet"
              value={fullName}
            />
            <ProfileRow
              icon={<Mail className="h-4 w-4" />}
              label="Adresse e-mail"
              value={
                <a
                  href={`mailto:${user.email}`}
                  className="text-blue-600 hover:underline"
                >
                  {user.email}
                </a>
              }
            />
            <ProfileRow
              icon={<Phone className="h-4 w-4" />}
              label="Téléphone"
              value={user.phone ?? <span className="text-slate-400 italic">Non renseigné</span>}
            />
            <ProfileRow
              icon={<Building2 className="h-4 w-4" />}
              label="Département"
              value={ep?.department ?? <span className="text-slate-400 italic">—</span>}
            />
            <ProfileRow
              icon={<Briefcase className="h-4 w-4" />}
              label="Poste"
              value={ep?.position ?? <span className="text-slate-400 italic">—</span>}
            />
            <ProfileRow
              icon={<Calendar className="h-4 w-4" />}
              label="Date d'embauche"
              value={formatDate(ep?.hire_date)}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier mon profil</DialogTitle><DialogDescription>Modifiez votre numéro de téléphone ou choisissez un nouveau mot de passe.</DialogDescription></DialogHeader>
          <form onSubmit={saveProfile} className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">Téléphone
              <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} className="w-full rounded-md border border-slate-200 px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">Nouveau mot de passe
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} placeholder="Nouveau mot de passe" autoComplete="new-password" className="w-full rounded-md border border-slate-200 px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="block text-xs font-normal text-slate-400">Laissez vide pour conserver le mot de passe actuel (8 caractères minimum).</span>
            </label>
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Account status ──────────────────────────────────────────────── */}
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Compte</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Statut du compte</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                user.is_active
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  user.is_active ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              {user.is_active ? "Actif" : "Inactif"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
