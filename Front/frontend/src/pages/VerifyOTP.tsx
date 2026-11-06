
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

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
    if (!email) {
      navigate("/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
        state: {
          resetToken: response.data.resetToken,
        },
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
    <div className="min-h-screen bg-[#f7f8f6] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <Link to="/" className="flex justify-center mb-8">
          <span className="text-3xl font-bold tracking-tight text-[#153d32]">
            CREDENCE<span className="text-[#78a891]">.</span>
          </span>
        </Link>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-7 sm:p-9">

          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#315f4c] mb-7"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          <div className="mb-7">
            <div className="w-12 h-12 rounded-xl bg-[#eaf3ed] flex items-center justify-center mb-5">
              <ShieldCheck size={24} className="text-[#315f4c]" />
            </div>

            <p className="text-sm font-semibold text-[#72917e] mb-2">
              EMAIL VERIFICATION
            </p>

            <h1 className="text-2xl font-bold text-gray-900">
              Verify your email
            </h1>

            <p className="text-sm text-gray-500 mt-2 leading-6">
              Enter the 6-digit verification code sent to:
            </p>

            <div className="flex items-center gap-2 mt-3 text-sm font-semibold text-[#315f4c]">
              <Mail size={16} />
              {email}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification code
              </label>

              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                className="w-full rounded-xl border border-gray-200 px-4 py-4 text-center text-2xl font-bold tracking-[0.6em] outline-none focus:border-[#315f4c] focus:ring-2 focus:ring-[#315f4c]/10"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-xl bg-[#244b3b] hover:bg-[#193c2e] disabled:opacity-60 text-white font-semibold py-3.5 text-sm transition-colors"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Didn't receive the code?
            </p>

            {countdown > 0 ? (
              <p className="mt-2 text-sm text-gray-400">
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
                className="mt-2 text-sm font-semibold text-[#315f4c] hover:underline disabled:opacity-50"
              >
                {resending ? "Sending..." : "Resend OTP"}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
