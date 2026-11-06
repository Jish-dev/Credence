
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserRound,
  Mail,
  Phone,
  Pencil,
  LockKeyhole,
  CalendarDays,
  Heart,
  LogOut,
  ShieldCheck,
  X,
  CheckCircle2,
  Eye,
  EyeOff,
  ChevronRight,
  Save,
} from "lucide-react";

import { api } from "../api";
import type { User } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f7f8f6] flex items-center justify-center px-4">
        <div className="text-center">
          <UserRound size={40} className="mx-auto text-[#315f4c]" />
          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Login required
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Please sign in to view your profile.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-5 rounded-xl bg-[#244b3b] px-6 py-3 text-sm font-semibold text-white"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const handleUpdateProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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

      const updatedUser = response.data.user as User;

      login(updatedUser);
      setEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
      setChangingPassword(true);

      const response = await api.patch("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      setSuccess(
        response.data.message || "Password changed successfully."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#315f4c] focus:ring-2 focus:ring-[#315f4c]/10";

  const passwordInput = (
    value: string,
    setter: (value: string) => void,
    visible: boolean,
    toggle: () => void,
    placeholder: string
  ) => (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => setter(e.target.value)}
        placeholder={placeholder}
        required
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#315f4c]"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f7f8f6] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72917e]">
            CREDENCE / ACCOUNT
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#153d32]">
            My Profile
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Manage your personal information and account settings.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            <X size={17} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 size={17} />
            {success}
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">

          {/* Sidebar */}
          <aside className="space-y-5">

            {/* User card */}
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#e7f1e9] text-2xl font-bold text-[#315f4c]">
                  {initials || <UserRound size={32} />}
                </div>

                <h2 className="mt-4 text-xl font-bold text-gray-900">
                  {user.name}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {user.email}
                </p>

                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#eaf3ed] px-3 py-1.5 text-xs font-semibold text-[#315f4c]">
                  <ShieldCheck size={14} />
                  Customer Account
                </div>
              </div>

              <div className="mt-6 border-t border-gray-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Quick access
                </p>

                <Link
                  to="/my-bookings"
                  className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-600 transition hover:bg-[#f3f7f3] hover:text-[#315f4c]"
                >
                  <CalendarDays size={19} />
                  My Bookings
                  <ChevronRight size={17} className="ml-auto" />
                </Link>

                <Link
                  to="/"
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-600 transition hover:bg-[#f3f7f3] hover:text-[#315f4c]"
                >
                  <Heart size={19} />
                  Find Professionals
                  <ChevronRight size={17} className="ml-auto" />
                </Link>
              </div>
            </section>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-5 py-4 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
            >
              <LogOut size={18} />
              Logout from account
            </button>
          </aside>

          {/* Main content */}
          <div className="space-y-6">

            {/* Personal information */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">

              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Personal Information
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Your basic account details.
                  </p>
                </div>

                {!editing && (
                  <button
                    onClick={() => {
                      setError("");
                      setSuccess("");
                      setEditing(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#dce9df] px-4 py-2.5 text-sm font-semibold text-[#315f4c] transition hover:bg-[#f2f7f3]"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleUpdateProfile} className="mt-7 space-y-5">

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-600">
                      Full name
                    </label>

                    <div className="relative">
                      <UserRound
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!editing}
                        required
                        className={`${inputClass} pl-11 disabled:bg-gray-50 disabled:text-gray-500`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-600">
                      Phone number
                    </label>

                    <div className="relative">
                      <Phone
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={!editing}
                        type="tel"
                        maxLength={20}
                        placeholder="Add phone number"
                        className={`${inputClass} pl-11 disabled:bg-gray-50 disabled:text-gray-500`}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-600">
                      Email address
                    </label>

                    <div className="relative">
                      <Mail
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        value={user.email}
                        disabled
                        className={`${inputClass} cursor-not-allowed bg-gray-50 pl-11 text-gray-500`}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      Email address cannot be changed here.
                    </p>
                  </div>
                </div>

                {editing && (
                  <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setName(user.name);
                        setPhone(user.phone || "");
                        setEditing(false);
                        setError("");
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <X size={16} />
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#244b3b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193c2e] disabled:opacity-60"
                    >
                      <Save size={16} />
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
              </form>
            </section>

            {/* Change password */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf3ed] text-[#315f4c]">
                  <LockKeyhole size={21} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Password & Security
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Keep your account secure.
                  </p>
                </div>
              </div>

              {!changingPassword ? (
                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-gray-100 bg-[#fafbf9] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Change your password
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Update your account password regularly.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setError("");
                      setSuccess("");
                      setChangingPassword(true);
                    }}
                    className="rounded-xl border border-[#dce9df] px-4 py-2.5 text-sm font-semibold text-[#315f4c] hover:bg-[#eaf3ed]"
                  >
                    Change Password
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleChangePassword}
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-600">
                      Current password
                    </label>
                    {passwordInput(
                      currentPassword,
                      setCurrentPassword,
                      showCurrent,
                      () => setShowCurrent(!showCurrent),
                      "Enter current password"
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-600">
                      New password
                    </label>
                    {passwordInput(
                      newPassword,
                      setNewPassword,
                      showNew,
                      () => setShowNew(!showNew),
                      "Enter new password"
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-600">
                      Confirm new password
                    </label>
                    {passwordInput(
                      confirmPassword,
                      setConfirmPassword,
                      showConfirm,
                      () => setShowConfirm(!showConfirm),
                      "Confirm new password"
                    )}
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setChangingPassword(false);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setError("");
                      }}
                      className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={changingPassword === false}
                      className="rounded-xl bg-[#244b3b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193c2e]"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Account information */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-lg font-bold text-gray-900">
                Account Information
              </h2>

              <div className="mt-5 divide-y divide-gray-100">
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Account type
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Your CREDENCE account role
                    </p>
                  </div>
                  <span className="rounded-full bg-[#eaf3ed] px-3 py-1.5 text-xs font-semibold capitalize text-[#315f4c]">
                    {user.role}
                  </span>
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Account status
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Current account access
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Active
                  </span>
                </div>
              </div>
            </section>

          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          CREDENCE · Your trusted service connection
        </p>
      </div>
    </main>
  );
}
