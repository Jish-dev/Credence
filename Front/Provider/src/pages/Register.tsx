
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { providerRegister } from "../services/authService";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

type FormData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  category: string;
  title: string;
  location: string;
};

const categories = [
  "Home Cleaning",
  "Plumbing",
  "Electrical Services",
  "Painting",
  "Carpentry",
  "Other",
];

const fieldClass =
  "h-10 w-full rounded-lg border border-[#dce8e1] " +
  "bg-[#f8fbf9] px-3 text-[12px] text-[#153b2d] " +
  "placeholder:text-[#a1b1a8] outline-none transition-all " +
  "focus:border-[#16845b] focus:bg-white " +
  "focus:ring-2 focus:ring-[#16845b]/10";

const labelClass =
  "mb-1.5 block text-[11px] font-semibold text-[#355b49]";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    password: "",
    category: "",
    title: "",
    location: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await providerRegister(form);

      setSuccess(
        response.message ||
          "Registration submitted. Please wait for admin approval."
      );

      navigate("/pending-approval");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="relative flex min-h-[100dvh] items-center justify-center bg-cover bg-center bg-no-repeat px-3 py-4 font-sans sm:px-5"
      style={{
        backgroundImage: "url('/login-bg.avif')",
      }}
    >
      {/* Full-page emerald overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[#062e22]/35" />

      {/* Main registration card */}
      <div className="relative z-10 grid w-full max-w-[970px] overflow-hidden rounded-[22px] border border-white/20 bg-white shadow-[0_25px_90px_-25px_rgba(0,0,0,0.35)] md:grid-cols-[0.79fr_1.21fr]">

        {/* Left emerald panel */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#07543d] p-8 text-white md:flex lg:p-10">

          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-32 top-1/3 h-80 w-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-20 top-[40%] h-56 w-56 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-[#16845b]/30 blur-3xl" />

          {/* Credence logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 p-2">
              <img
                src="/C-Logo.png"
                alt="Credence Logo"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <h1 className="text-[20px] font-bold tracking-[0.08em]">
                CREDENCE
              </h1>
              <p className="text-[9px] tracking-[0.18em] text-emerald-100/60">
                PROVIDER NETWORK
              </p>
            </div>
          </div>

          {/* Minimal brand message */}
          <div className="relative z-10">
            <span className="mb-5 inline-block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a6e7bd]">
              Welcome to Credence
            </span>

            <h2 className="text-[38px] font-semibold leading-[1.15] tracking-[-0.045em] lg:text-[43px]">
              Grow with
              <br />
              <span className="text-[#a6e7bd]">
                confidence.
              </span>
            </h2>

            <p className="mt-5 max-w-[280px] text-[12px] leading-7 text-emerald-100/70">
              Connect with customers, showcase your skills,
              and build your professional journey.
            </p>
          </div>

          {/* Footer */}
          <p className="relative z-10 text-[10px] text-emerald-100/45">
            © 2026 Credence. All rights reserved.
          </p>
        </aside>

        {/* Registration form */}
        <section className="flex flex-col justify-center px-5 py-6 sm:px-9 md:px-9 lg:px-11">

          {/* Mobile logo */}
          <div className="mb-5 flex items-center gap-2 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#07543d] p-1.5">
              <img
                src="/C-Logo.png"
                alt="Credence"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-base font-bold tracking-wider text-[#07543d]">
              CREDENCE
            </span>
          </div>

          {/* Form heading */}
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#159567]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#16845b]">
                Provider registration
              </span>
            </div>

            <h2 className="text-[25px] font-bold tracking-[-0.045em] text-[#103e2c] sm:text-[29px]">
              Create your account
              <span className="text-[#159567]">.</span>
            </h2>

            <p className="mt-1 text-[12px] text-[#83988c]">
              A few details and you're one step closer to joining.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Two-column fields */}
            <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">

              <div>
                <label htmlFor="name" className={labelClass}>
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Your full name"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="Your contact number"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="category" className={labelClass}>
                  Service category
                </label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className={`${fieldClass} ${
                    !form.category ? "text-[#a1b1a8]" : ""
                  }`}
                >
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="title" className={labelClass}>
                  Professional title
                </label>
                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Expert Electrician"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="location" className={labelClass}>
                  Your location
                </label>
                <input
                  id="location"
                  name="location"
                  autoComplete="address-level2"
                  value={form.location}
                  onChange={handleChange}
                  required
                  placeholder="City, State"
                  className={fieldClass}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelClass}>
                Create password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#91a79b]"
                />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  className={`${fieldClass} pl-9 pr-10`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#91a79b] transition hover:text-[#07543d]"
                >
                  {showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-600"
              >
                {error}
              </div>
            )}

            {/* Success message */}
            {success && (
              <div
                role="status"
                className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700"
              >
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#08734f] text-[12px] font-semibold text-white shadow-[0_7px_18px_-8px_rgba(8,115,79,0.6)] transition-all hover:bg-[#065a3e] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creating your account..."
                : "Create provider account"}

              {!loading && (
                <ArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-1"
                />
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-4 text-center">
            <p className="text-[14px] text-[#84988c]">
              Already have an account?{" "}
              <Link
                to="/"
                className="font-bold text-[#08734f] transition hover:text-[#034d34]"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Approval notice */}
          <div className="mt-4 flex items-center justify-center gap-2 border-t border-[#edf2ee] pt-3">
            <ShieldCheck
              size={13}
              className="text-[#16845b]"
            />
            <p className="text-center text-[10px] text-[#96a89c]">
              Provider accounts are reviewed before approval.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
