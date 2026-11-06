
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { ArrowLeft, LockKeyhole, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const resetToken = location.state?.resetToken as string | undefined;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!resetToken) {
      setError("Reset session expired. Please start again.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/reset-password", {
        resetToken,
        newPassword: password,
      });

      if (response.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <div className="min-h-screen bg-[#f7f8f6] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <LockKeyhole size={40} className="mx-auto text-[#315f4c]" />
          <h1 className="mt-5 text-xl font-bold text-gray-900">
            Reset session expired
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Please request a new OTP to reset your password.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block mt-6 rounded-xl bg-[#244b3b] px-6 py-3 text-sm font-semibold text-white"
          >
            Request new OTP
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f7f8f6] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <CheckCircle2 size={52} className="mx-auto text-green-600" />

          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            Password reset successful!
          </h1>

          <p className="mt-2 text-sm text-gray-500 leading-6">
            Your CREDENCE account password has been updated.
            You can now sign in using your new password.
          </p>

          <button
            onClick={() => navigate("/login", { replace: true })}
            className="mt-7 w-full rounded-xl bg-[#244b3b] hover:bg-[#193c2e] text-white font-semibold py-3.5 text-sm"
          >
            Continue to Login
          </button>
        </div>
      </div>
    );
  }

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
              NEW PASSWORD
            </p>

            <h1 className="text-2xl font-bold text-gray-900">
              Create new password
            </h1>

            <p className="text-sm text-gray-500 mt-2 leading-6">
              Choose a strong password for your CREDENCE account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={6}
                  maxLength={100}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-16 text-sm outline-none focus:border-[#315f4c] focus:ring-2 focus:ring-[#315f4c]/10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#315f4c]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <p className="mt-1.5 text-xs text-gray-400">
                Minimum 6 characters.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm new password
              </label>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-16 text-sm outline-none focus:border-[#315f4c] focus:ring-2 focus:ring-[#315f4c]/10"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#315f4c]"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#244b3b] hover:bg-[#193c2e] disabled:opacity-60 text-white font-semibold py-3.5 text-sm transition-colors"
            >
              {loading ? "Updating password..." : "Reset Password"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
