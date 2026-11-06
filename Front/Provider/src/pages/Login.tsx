
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ArrowRight,
  ShieldCheck,
  BriefcaseBusiness,
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to login.";

      if (
        message.toLowerCase().includes("pending") ||
        message.toLowerCase().includes("approval") ||
        message.toLowerCase().includes("not verified")
      ) {
        navigate("/pending-approval");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F6F5] text-[#14211F] antialiased lg:grid lg:grid-cols-2">

      {/* LEFT PANEL */}
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#102B28] p-12 text-white lg:flex xl:p-16">

        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute -bottom-40 -left-32 h-[450px] w-[450px] rounded-full bg-[#0F766E]/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0F766E]">
            <BriefcaseBusiness size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              CREDENCE<span className="text-[#4CC5B8]">.</span>
            </h1>
            <p className="mt-0.5 text-[10px] font-semibold tracking-[0.22em] text-[#A8C9C3]">
              PROVIDER PORTAL
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-[#B8DAD4]">
            <span className="h-2 w-2 rounded-full bg-[#4CC5B8]" />
            YOUR BUSINESS, BETTER MANAGED
          </div>

          <h2 className="text-5xl font-bold leading-[1.15] tracking-tight xl:text-6xl">
            Build your work.
            <br />
            <span className="text-[#4CC5B8]">Grow your business.</span>
          </h2>

          <p className="mt-6 max-w-md text-base leading-8 text-[#B4C9C4]">
            Manage bookings, connect with customers and keep track of your
            earnings — all from one simple workspace.
          </p>

          <div className="mt-12 grid max-w-md grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
              <ShieldCheck className="mb-3 text-[#4CC5B8]" size={22} />
              <p className="text-sm font-semibold">Trusted platform</p>
              <p className="mt-1 text-xs text-[#A8C9C3]">
                A workspace built for providers
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
              <BriefcaseBusiness className="mb-3 text-[#4CC5B8]" size={22} />
              <p className="text-sm font-semibold">Manage with ease</p>
              <p className="mt-1 text-xs text-[#A8C9C3]">
                Bookings, services and earnings
              </p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-[#8EAAA4]">
          © 2026 CREDENCE. All rights reserved.
        </p>
      </section>

      {/* RIGHT PANEL */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-12">

        <div className="w-full max-w-[440px]">

          {/* MOBILE BRAND */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0F766E] text-white">
              <BriefcaseBusiness size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                CREDENCE<span className="text-[#0F766E]">.</span>
              </h1>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-[#0F766E]">
                PROVIDER PORTAL
              </p>
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#0F766E]">
              Provider account
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-[#14211F] sm:text-4xl">
              Welcome back
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#667570]">
              Sign in to access your provider workspace and manage your
              business.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* EMAIL */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-[#33413E]"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#82918C]"
                />

                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="min-h-12 w-full rounded-xl border border-[#DCE5E1] bg-white py-3 pl-11 pr-4 text-sm text-[#14211F] outline-none transition placeholder:text-[#A0ACA8] hover:border-[#A9C4BD] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-[#33413E]"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#82918C]"
                />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="min-h-12 w-full rounded-xl border border-[#DCE5E1] bg-white py-3 pl-11 pr-12 text-sm text-[#14211F] outline-none transition placeholder:text-[#A0ACA8] hover:border-[#A9C4BD] focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#82918C] transition hover:text-[#0F766E]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700"
              >
                {error}
              </div>
            )}

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-[#0F766E]/15 transition hover:bg-[#0B5F58] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0F766E]/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in to your account"}
              {!loading && (
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              )}
            </button>
          </form>

          {/* REGISTER */}
          <div className="mt-8 border-t border-[#E1E9E6] pt-6 text-center">
            <p className="text-sm text-[#667570]">
              Don't have a provider account?{" "}
              <Link
                to="/register"
                className="font-bold text-[#0F766E] transition hover:text-[#0B5F58]"
              >
                Register now
              </Link>
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#899792]">
            <ShieldCheck size={15} />
            Secure provider sign in
          </div>

        </div>
      </section>
    </div>
  );
}
