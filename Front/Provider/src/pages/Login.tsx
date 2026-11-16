
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../hooks/usAuth";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to login.";

      const normalized = message.toLowerCase();

      if (
        normalized.includes("pending") ||
        normalized.includes("approval") ||
        normalized.includes("not verified")
      ) {
        navigate("/pending-approval");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-11 w-full rounded-xl border border-[#dce8e1] " +
    "bg-[#f8fbf9] pl-11 pr-4 text-[13px] text-[#153b2d] " +
    "placeholder:text-[#9cafa4] outline-none transition-all " +
    "hover:border-[#b6d1c1] focus:border-[#16845b] " +
    "focus:bg-white focus:ring-4 focus:ring-[#16845b]/10";

  return (
    <main
      className="relative flex min-h-[100dvh] items-center justify-center bg-cover bg-center bg-no-repeat px-4 py-5 font-sans"
      style={{
        backgroundImage: "url('/login-bg.avif')",
      }}
    >
      {/* Background overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[#062e22]/40" />

      {/* Main card */}
      <div className="relative z-10 grid w-full max-w-[900px] overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-[0_30px_100px_-25px_rgba(0,0,0,0.4)] md:grid-cols-[0.9fr_1.1fr]">

        {/* Left brand panel */}
        <aside className="relative hidden min-h-[480px] flex-col justify-between overflow-hidden bg-[#07543d] p-9 text-white md:flex lg:p-11">

          {/* Decorative elements */}
          <div className="pointer-events-none absolute -right-32 top-20 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-20 top-32 h-52 w-52 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#16845b]/30 blur-3xl" />

          {/* Brand */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 p-2">
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
              <p className="text-[9px] tracking-[0.2em] text-emerald-100/60">
                PROVIDER NETWORK
              </p>
            </div>
          </div>

          {/* Minimal content */}
          <div className="relative z-10">
            <span className="mb-5 inline-block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a6e7bd]">
              Welcome back
            </span>

            <h2 className="text-[38px] font-semibold leading-[1.15] tracking-[-0.045em] lg:text-[43px]">
              Your work.
              <br />
              <span className="text-[#a6e7bd]">
                Your growth.
              </span>
            </h2>

            <p className="mt-5 max-w-[285px] text-[12px] leading-7 text-emerald-100/70">
              Manage your services, connect with customers,
              and grow your professional journey with Credence.
            </p>
          </div>

          {/* Footer */}
          <p className="relative z-10 text-[10px] text-emerald-100/45">
            © 2026 Credence. All rights reserved.
          </p>
        </aside>

        {/* Right login form */}
        <section className="flex flex-col justify-center px-6 py-9 sm:px-10 md:px-9 lg:px-12">

          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#07543d] p-2">
              <img
                src="/C-Logo.png"
                alt="Credence"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-[17px] font-bold tracking-wider text-[#07543d]">
                CREDENCE
              </h1>
              <p className="text-[9px] tracking-[0.16em] text-[#16845b]">
                PROVIDER NETWORK
              </p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#159567]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#16845b]">
                Provider portal
              </span>
            </div>

            <h2 className="text-[29px] font-bold tracking-[-0.045em] text-[#103e2c] sm:text-[32px]">
              Welcome back
              <span className="text-[#159567]">.</span>
            </h2>

            <p className="mt-2 text-[12px] leading-6 text-[#83988c]">
              Sign in to continue to your provider workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-[12px] font-semibold text-[#355b49]"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#91a79b]"
                />

                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[12px] font-semibold text-[#355b49]"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#91a79b]"
                />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${inputClass} pr-12`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#91a79b] transition hover:text-[#07543d]"
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] text-red-600"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#08734f] text-[12px] font-semibold text-white shadow-[0_7px_18px_-8px_rgba(8,115,79,0.6)] transition-all hover:bg-[#065a3e] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in to Credence"}

              {!loading && (
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              )}
            </button>
          </form>

          {/* Register link */}
          <div className="mt-6 border-t border-[#edf2ee] pt-5 text-center">
            <p className="text-[12px] text-[#84988c]">
              New to Credence?{" "}
              <Link
                to="/register"
                className="font-bold text-[#08734f] transition hover:text-[#034d34]"
              >
                Create an account
              </Link>
            </p>
          </div>

          {/* Security note */}
          <div className="mt-5 flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-[#16845b]" />
            <p className="text-[10px] text-[#96a89c]">
              Secure provider sign in
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
