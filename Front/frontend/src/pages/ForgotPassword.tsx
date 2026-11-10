
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
} from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      setLoading(true);

      const response = await api.post("/auth/forgot-password", {
        email: email.trim(),
      });

      setSuccess(response.data.message);

      navigate("/verify-otp", {
        state: { email: email.trim() },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "peer h-[48px] w-full rounded-xl border border-white/80 bg-[#edf3f1]/90 pl-11 pr-4 pt-3 text-sm text-gray-800 outline-none transition placeholder:text-transparent focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-700/10";

  const labelClass =
    "pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 origin-left text-sm text-gray-400 transition-all duration-200 peer-focus:top-[9px] peer-focus:translate-y-0 peer-focus:scale-[0.78] peer-focus:font-semibold peer-focus:text-emerald-700 peer-[:not(:placeholder-shown)]:top-[9px] peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-[0.78] peer-[:not(:placeholder-shown)]:font-semibold";

  return (
    <main className="fixed inset-0 isolate flex h-dvh w-full items-center justify-center overflow-hidden bg-[#eaf5f0]">

      {/* BACKGROUND IMAGE */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
      >
        <img
          src="/login-bg.avif"
          alt=""
          className="h-full w-full object-cover"
        />

        {/* Background overlay */}
        <div className="absolute inset-0 bg-[#102b20]/25 backdrop-blur-[2px]" />

        {/* Soft emerald glow */}
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-emerald-300/20 blur-[110px]" />

        <div className="absolute -bottom-40 -right-32 h-[500px] w-[500px] rounded-full bg-teal-300/20 blur-[110px]" />
      </div>

      {/* FIXED CENTERED CARD */}
      <div className="relative z-40 flex h-full w-full items-center justify-center overflow-hidden px-4">

        <section className="relative w-full max-w-[410px] shrink-0 overflow-hidden rounded-[26px] border border-white/70 bg-white/85 px-5 pb-5 pt-5 shadow-[0_20px_70px_rgba(15,45,32,0.22)] backdrop-blur-2xl sm:px-7">

          {/* CARD DECORATION */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-200/30 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-teal-200/30 blur-3xl" />

          <div className="relative z-10">

            {/* LOGO */}
            <Link
              to="/"
              className="mb-3 flex justify-center"
              aria-label="Credence home"
            >
              <img
                src="/C-Logo.png"
                alt="CREDENCE"
                className="h-[48px] w-[48px] rounded-2xl object-contain drop-shadow-md"
              />
            </Link>

            {/* BACK LINK */}
            <Link
              to="/login"
              className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-[#315f4c]"
            >
              <ArrowLeft size={14} />
              Back to login
            </Link>

            {/* HEADING */}
            <div className="mb-5">

              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf3ed]">
                <ShieldCheck
                  size={21}
                  className="text-[#315f4c]"
                />
              </div>

              <p className="mb-1 text-[10px] font-bold tracking-[0.2em] text-[#72917e]">
                ACCOUNT RECOVERY
              </p>

              <h1 className="text-[24px] font-bold tracking-tight text-[#142e23]">
                Forgot password?
              </h1>

              <p className="mt-1.5 text-xs leading-5 text-gray-500">
                Enter your registered email address. We'll send you a
                verification code to reset your password.
              </p>
            </div>

            {/* FORGOT PASSWORD FORM */}
            <form onSubmit={handleSubmit} className="space-y-3">

              {/* EMAIL */}
              <div className="relative">

                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
                  <Mail size={17} />
                </span>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  required
                  maxLength={150}
                  autoComplete="email"
                  className={inputClass}
                />

                <label
                  htmlFor="email"
                  className={labelClass}
                >
                  Email address
                </label>

              </div>

              {/* ERROR */}
              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}

              {/* SUCCESS */}
              {success && (
                <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-700">
                  {success}
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full rounded-xl border border-[#142e23] bg-gradient-to-b from-[#315f4c] to-[#193c2e] py-2.5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(25,60,46,0.20)] transition duration-200 hover:-translate-y-0.5 hover:from-[#244d3b] hover:to-[#102e22] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending OTP..." : "Send verification code"}
              </button>

            </form>

            {/* SIGN IN LINK */}
            <p className="mb-0 mt-4 text-center text-xs text-gray-500">
              Remember your password?{" "}
              <Link
                to="/login"
                className="font-bold text-[#315f4c] transition hover:text-emerald-800 hover:underline"
              >
                Sign in
              </Link>
            </p>

            {/* SECURITY NOTE */}
            <p className="mt-3 text-center text-[10px] text-gray-400">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={12} />
                Your account security matters to us.
              </span>
            </p>

          </div>
        </section>
      </div>
    </main>
  );
}
