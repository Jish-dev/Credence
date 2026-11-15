import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserRound,
  Mail,
  Phone,
  Pencil,
  LockKeyhole,
  ShieldCheck,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Loader2,
} from "lucide-react";

import { api } from "../api";
import type { User } from "../api";
import { useAuth } from "../context/AuthContext";

// ========================================
// HELPERS
// ========================================

function getErrorMessage(error: unknown, fallback: string) {
  const apiMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;

  if (apiMessage) return apiMessage;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

function Field({
  label,
  icon,
  hint,
  children,
}: {
  label: string;
  icon: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600">
          {icon}
        </span>
        {children}
      </div>
      {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-emerald-700"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

// ========================================
// PAGE
// ========================================

export default function Profile() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
  }, [user]);

  // ----------------------------------------
  // Signed-out state
  // ----------------------------------------

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F8F5] px-4">
        <div className="w-full max-w-sm rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl shadow-emerald-900/5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <UserRound size={28} />
          </div>
          <h2 className="mt-5 text-xl font-black text-slate-900">
            Login required
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Please sign in to view your profile.
          </p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-6 w-full rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 active:scale-95"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  // ----------------------------------------
  // Derived
  // ----------------------------------------

  const initials = (user.name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const roleLabel =
    user.role === "customer"
      ? "Customer"
      : user.role
        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
        : "Member";

  // ----------------------------------------
  // Actions
  // ----------------------------------------

  const startEditing = () => {
    setError("");
    setSuccess("");
    setEditing(true);
  };

  const cancelEditing = () => {
    setName(user.name || "");
    setPhone(user.phone || "");
    setEditing(false);
    setError("");
  };

  const handleUpdateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (name.trim().length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    try {
      setSaving(true);

      const response = await api.patch("/auth/profile", {
        name: name.trim(),
        phone: phone.trim(),
      });

      login(response.data.user as User);
      setEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update profile."));
    } finally {
      setSaving(false);
    }
  };

  const closePasswordForm = () => {
    setPasswordOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("New password must contain at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    try {
      setPasswordSaving(true);

      const response = await api.patch("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      closePasswordForm();
      setSuccess(response.data?.message || "Password changed successfully.");
    } catch (err) {
      // Keep the form open so the person can correct and retry.
      setError(getErrorMessage(err, "Unable to change password."));
    } finally {
      setPasswordSaving(false);
    }
  };

  // ----------------------------------------
  // UI
  // ----------------------------------------

  return (
    <main className="min-h-screen bg-[#F4F8F5] font-sans text-slate-800">

      {/* Cover */}

      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-600 sm:h-64">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 pt-28">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
            Credence · Account
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
            My Profile
          </h1>
        </div>
      </div>

      <div className="relative mx-auto -mt-12 max-w-4xl px-4 pb-16 sm:px-6">

        {/* Identity card */}

        <section className="rounded-3xl border border-white bg-white p-6 shadow-xl shadow-emerald-900/10 sm:p-8">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="-mt-14 flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-emerald-600 to-emerald-800 text-3xl font-black text-white shadow-lg sm:-mt-16 sm:h-28 sm:w-28 sm:text-4xl">
              {initials || <UserRound size={40} />}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-black text-slate-900">
                {user.name}
              </h2>
              <p className="mt-1 truncate text-sm text-slate-500">
                {user.email}
              </p>

              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                  <ShieldCheck size={14} />
                  {roleLabel} account
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
            </div>

            {!editing && (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-700/20 transition hover:bg-emerald-800 active:scale-95"
              >
                <Pencil size={16} />
                Edit profile
              </button>
            )}
          </div>
        </section>

        {/* Alerts */}

        <div aria-live="polite" className="mt-5 space-y-3 empty:hidden">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              {success}
            </div>
          )}
        </div>

        {/* Personal information */}

        <section className="mt-5 rounded-3xl border border-white bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Personal information
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {editing
                ? "Update your details and save your changes."
                : "Your basic account details."}
            </p>
          </div>

          <form onSubmit={handleUpdateProfile} className="mt-7">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Full name" icon={<UserRound size={17} />}>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={!editing}
                  required
                  className={`${inputClass} pl-11`}
                />
              </Field>

              <Field label="Phone number" icon={<Phone size={17} />}>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={!editing}
                  type="tel"
                  maxLength={20}
                  placeholder="Add phone number"
                  className={`${inputClass} pl-11`}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field
                  label="Email address"
                  icon={<Mail size={17} />}
                  hint="Email address cannot be changed here."
                >
                  <input
                    value={user.email}
                    disabled
                    className={`${inputClass} pl-11`}
                  />
                </Field>
              </div>
            </div>

            {editing && (
              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <X size={16} />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-700/20 transition hover:bg-emerald-800 active:scale-95 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            )}
          </form>
        </section>

        {/* Password & security */}

        <section className="mt-5 rounded-3xl border border-white bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <LockKeyhole size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Password & security
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Keep your account secure with a strong password.
                </p>
              </div>
            </div>

            {!passwordOpen && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setPasswordOpen(true);
                }}
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-emerald-200 px-5 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
              >
                Change password
              </button>
            )}
          </div>

          {passwordOpen && (
            <form
              onSubmit={handleChangePassword}
              className="mt-7 space-y-5 border-t border-slate-100 pt-7"
            >
              <PasswordField
                label="Current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Enter current password"
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <PasswordField
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="At least 6 characters"
                />
                <PasswordField
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter new password"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    closePasswordForm();
                    setError("");
                  }}
                  disabled={passwordSaving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-700/20 transition hover:bg-emerald-800 active:scale-95 disabled:opacity-60"
                >
                  {passwordSaving && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {passwordSaving ? "Updating..." : "Update password"}
                </button>
              </div>
            </form>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          Credence · Your trusted service network
        </p>
      </div>
    </main>
  );
}