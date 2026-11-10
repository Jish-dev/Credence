
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import {
  ArrowLeft,
  LockKeyhole,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";

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

  const inputClass =
    "peer h-[48px] w-full rounded-xl border border-white/80 bg-[#edf3f1]/90 pl-11 pr-12 pt-3 text-sm text-gray-800 outline-none transition placeholder:text-transparent focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-700/10";

  const labelClass =
    "pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 origin-left text-sm text-gray-400 transition-all duration-200 peer-focus:top-[9px] peer-focus:translate-y-0 peer-focus:scale-[0.78] peer-focus:font-semibold peer-focus:text-emerald-700 peer-[:not(:placeholder-shown)]:top-[9px] peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-[0.78] peer-[:not(:placeholder-shown)]:font-semibold";

  const iconClass =
    "pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400";

  // Shared fixed background for all page states
  const PageBackground = () => (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <img
          src="/login-bg.avif"
          alt=""
          className="h-full w-full object-cover object-center"
        />
      </div>

      <div className="pointer-events-none fixed inset-0 z-10 bg-[#0b2118]/35 backdrop-blur-[3px]" />
    </>
  );

  // Expired reset session
  if (!resetToken) {
    return (
      <main className="relative isolate flex h-dvh w-full items-center justify-center overflow-y-auto bg-[#eaf5f0] px-4 py-6">
        <PageBackground />

        <div className="relative z-40 my-auto w-full max-w-[410px]">
          <section className="rounded-[26px] border border-white/70 bg-white/85 px-6 py-8 text-center shadow-[0_20px_70px_rgba(15,45,32,0.18)] backdrop-blur-2xl sm:px-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf3ed]">
              <LockKeyhole size={27} className="text-[#315f4c]" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-[#142e23]">
              Reset session expired
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Your password reset session has expired. Please request a new
              OTP to continue.
            </p>

            <Link
              to="/forgot-password"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#315f4c] to-[#193c2e] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:from-[#244d3b] hover:to-[#102e22]"
            >
              Request new OTP
            </Link>

            <Link
              to="/login"
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#315f4c] hover:underline"
            >
              <ArrowLeft size={14} />
              Back to login
            </Link>
          </section>
        </div>
      </main>
    );
  }

  // Successful password reset
  if (success) {
    return (
      <main className="relative isolate flex h-dvh w-full items-center justify-center overflow-y-auto bg-[#eaf5f0] px-4 py-6">
        <PageBackground />

        <div className="relative z-40 my-auto w-full max-w-[410px]">
          <section className="rounded-[26px] border border-white/70 bg-white/85 px-6 py-8 text-center shadow-[0_20px_70px_rgba(15,45,32,0.18)] backdrop-blur-2xl sm:px-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
              <CheckCircle2 size={34} className="text-emerald-600" />
            </div>

            <p className="mt-5 text-[10px] font-bold tracking-[0.2em] text-[#72917e]">
              ALL SET
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#142e23]">
              Password updated!
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Your CREDENCE account password has been successfully updated.
              You can now sign in using your new password.
            </p>

            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="mt-7 w-full rounded-xl border border-[#142e23] bg-gradient-to-b from-[#315f4c] to-[#193c2e] py-3 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(25,60,46,0.20)] transition duration-200 hover:-translate-y-0.5 hover:from-[#244d3b] hover:to-[#102e22]"
            >
              Continue to Login
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate h-dvh w-full overflow-hidden bg-[#eaf5f0]">
      <PageBackground />

      <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto px-4 py-3">
        <div className="my-auto w-full max-w-[410px]">
          <section className="relative w-full overflow-hidden rounded-[26px] border border-white/70 bg-white/85 px-5 pb-5 pt-5 shadow-[0_20px_70px_rgba(15,45,32,0.18)] backdrop-blur-2xl sm:px-7">

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
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-[#315f4c]"
              >
                <ArrowLeft size={14} />
                Back to login
              </Link>

              {/* HEADING */}
              <div className="mb-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf3ed]">
                  <ShieldCheck size={21} className="text-[#315f4c]" />
                </div>

                <p className="mb-1 text-[10px] font-bold tracking-[0.2em] text-[#72917e]">
                  ACCOUNT SECURITY
                </p>

                <h1 className="text-[24px] font-bold tracking-tight text-[#142e23]">
                  Create new password
                </h1>

                <p className="mt-1.5 text-xs leading-5 text-gray-500">
                  Choose a strong password to keep your CREDENCE account
                  secure.
                </p>
              </div>

              {/* RESET PASSWORD FORM */}
              <form onSubmit={handleSubmit} className="space-y-3">

                {/* NEW PASSWORD */}
                <div className="relative">
                  <span className={iconClass}>
                    <LockKeyhole size={17} />
                  </span>

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=" "
                    required
                    minLength={6}
                    maxLength={100}
                    autoComplete="new-password"
                    className={inputClass}
                  />

                  <label htmlFor="password" className={labelClass}>
                    New password
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-4 flex items-center text-[#315f4c]"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                <p className="-mt-1 pl-1 text-[10px] text-gray-400">
                  Minimum 6 characters.
                </p>

                {/* CONFIRM PASSWORD */}
                <div className="relative">
                  <span className={iconClass}>
                    <KeyRound size={17} />
                  </span>

                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder=" "
                    required
                    autoComplete="new-password"
                    className={inputClass}
                  />

                  <label htmlFor="confirmPassword" className={labelClass}>
                    Confirm new password
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    className="absolute inset-y-0 right-4 flex items-center text-[#315f4c]"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>

                {/* ERROR */}
                {error && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                    {error}
                  </div>
                )}

                {/* SUBMIT */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 w-full rounded-xl border border-[#142e23] bg-gradient-to-b from-[#315f4c] to-[#193c2e] py-2.5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(25,60,46,0.20)] transition duration-200 hover:-translate-y-0.5 hover:from-[#244d3b] hover:to-[#102e22] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Updating password..." : "Reset Password"}
                </button>
              </form>

              <p className="mt-4 text-center text-[10px] text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck size={12} />
                  Your password is securely protected.
                </span>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
