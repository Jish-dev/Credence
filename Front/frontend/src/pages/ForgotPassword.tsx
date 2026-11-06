
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

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

      // Continue to OTP verification
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
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#315f4c] mb-7"
          >
            <ArrowLeft size={16} />
            Back to login
          </Link>

          <div className="mb-7">
            <div className="w-12 h-12 rounded-xl bg-[#eaf3ed] flex items-center justify-center mb-5">
              <ShieldCheck size={24} className="text-[#315f4c]" />
            </div>

            <p className="text-sm font-semibold text-[#72917e] mb-2">
              ACCOUNT RECOVERY
            </p>

            <h1 className="text-2xl font-bold text-gray-900">
              Forgot password?
            </h1>

            <p className="text-sm text-gray-500 mt-2 leading-6">
              Enter your registered email address. We'll send you a
              verification code to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-gray-200 pl-11 pr-4 py-3 text-sm outline-none focus:border-[#315f4c] focus:ring-2 focus:ring-[#315f4c]/10"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#244b3b] hover:bg-[#193c2e] disabled:opacity-60 text-white font-semibold py-3.5 text-sm transition-colors"
            >
              {loading ? "Sending OTP..." : "Send verification code"}
            </button>

          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Remember your password?{" "}
            <Link
              to="/login"
              className="font-semibold text-[#315f4c] hover:underline"
            >
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
