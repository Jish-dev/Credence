
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { ArrowLeft, Mail, ShieldCheck, RefreshCw } from "lucide-react";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!email) navigate("/forgot-password", { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = window.setInterval(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/auth/verify-reset-otp", {
        email,
        otp,
      });

      navigate("/reset-password", {
        state: { resetToken: response.data.resetToken },
        replace: true,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "OTP verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setOtp("");

    try {
      setResending(true);
      await api.post("/auth/forgot-password", { email });
      setCountdown(60);
      inputRef.current?.focus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to resend OTP."
      );
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  return (
    <main className="fixed inset-0 isolate flex h-dvh w-full items-center justify-center overflow-hidden bg-[#eaf5f0] p-3 sm:p-4">

      {/* Fixed Background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <img
          src="/login-bg.avif"
          alt=""
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#102b20]/35" />
      </div>

      {/* Compact OTP Card */}
      <section className="relative z-10 w-full max-w-[400px] max-h-full overflow-y-auto rounded-[24px] border border-white/70 bg-white/95 px-5 py-5 shadow-[0_20px_70px_rgba(15,45,32,0.22)] backdrop-blur-xl sm:px-7 sm:py-6">

        {/* Back */}
        <Link
          to="/forgot-password"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-emerald-800"
        >
          <ArrowLeft size={15} />
          Back
        </Link>

        {/* Header */}
        <div className="mt-3 text-center">

          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf3ed] text-[#315f4c]">
            <ShieldCheck size={21} strokeWidth={1.8} />
          </div>

          <p className="mb-1 text-[9px] font-bold tracking-[0.2em] text-[#72917e]">
            EMAIL VERIFICATION
          </p>

          <h1 className="text-[23px] font-bold tracking-tight text-[#142e23]">
            Verify your email
          </h1>

          <p className="mx-auto mt-1.5 max-w-[290px] text-[13px] leading-5 text-slate-500">
            Enter the 6-digit verification code we sent to your email address.
          </p>

          {/* Email */}
          <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-[#edf5f0] px-3 py-1.5 text-xs font-semibold text-[#315f4c]">
            <Mail size={14} className="shrink-0" />
            <span className="truncate">{email}</span>
          </div>
        </div>

        {/* OTP Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">

          <div>
            <label
              htmlFor="otp"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Verification code
            </label>

            <input
              ref={inputRef}
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              required
              className="h-[50px] w-full rounded-xl border border-slate-200 bg-[#f7faf8] px-4 text-center text-xl font-bold tracking-[0.65em] text-[#193c2e] outline-none transition placeholder:text-slate-300 focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-700/10"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full rounded-xl bg-[#244b3b] py-3 text-sm font-semibold text-white transition hover:bg-[#193c2e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        {/* Resend */}
        <div className="mt-4 border-t border-slate-100 pt-3 text-center">
          <p className="text-xs text-slate-500">
            Didn't receive the code?
          </p>

          {countdown > 0 ? (
            <p className="mt-1.5 text-xs text-slate-400">
              Resend available in{" "}
              <span className="font-semibold text-[#315f4c]">
                {countdown}s
              </span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="mt-1.5 inline-flex items-center gap-2 text-xs font-semibold text-[#315f4c] transition hover:text-emerald-900 hover:underline disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={resending ? "animate-spin" : ""}
              />
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
