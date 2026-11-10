import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { api } from "../api";
import type { User } from "../api";
import { useAuth } from "../context/AuthContext";

type LoginResponse = {
  success: boolean;
  message: string;
  token: string;
  user: User;
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const destination = location.state?.from || "/";

  const completeLogin = (data: LoginResponse) => {
    if (data.user.role !== "customer") {
      throw new Error("Please use the customer login.");
    }

    localStorage.setItem("credence_token", data.token);
    login(data.user);
    navigate(destination, { replace: true });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const response = await api.post<LoginResponse>("/auth/login", {
        email: email.trim(),
        password,
      });

      completeLogin(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Google Identity Services returns an ID token in credential.
  // The backend verifies this token and issues the CREDENCE JWT.
  const handleGoogleSuccess = async (response: CredentialResponse) => {
    setError("");

    if (!response.credential) {
      setError("Google did not return a valid credential. Please try again.");
      return;
    }

    try {
      setGoogleLoading(true);

      const result = await api.post<LoginResponse>("/auth/google", {
        credential: response.credential,
      });

      completeLogin(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Google sign-in failed. Please try again."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-in was cancelled or failed. Please try again.");
  };

  const inputClass =
    "peer h-[48px] w-full rounded-xl border border-white/80 bg-[#edf3f1]/90 pl-11 pr-4 pt-3 text-sm text-gray-800 outline-none transition placeholder:text-transparent focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-700/10";

  const labelClass =
    "pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 origin-left text-sm text-gray-400 transition-all duration-200 peer-focus:top-[9px] peer-focus:translate-y-0 peer-focus:scale-[0.78] peer-focus:font-semibold peer-focus:text-emerald-700 peer-[:not(:placeholder-shown)]:top-[9px] peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-[0.78] peer-[:not(:placeholder-shown)]:font-semibold";

  const iconClass =
    "pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400";

  return (
    <main className="fixed inset-0 isolate h-dvh w-full overflow-hidden bg-[#eaf5f0]">
      {/* FIXED LOGIN BACKGROUND */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
      >
        <img
          src="/login-bg.avif"
          alt=""
          className="h-full w-full object-cover object-center"
        />
      </div>

      {/* SUBTLE OVERLAY FOR READABILITY */}
      <div className="pointer-events-none fixed inset-0 z-10 bg-[#102b20]/30" />

      {/* FIXED, CENTERED LOGIN CONTENT */}
      <div className="fixed inset-0 z-40 flex h-dvh w-full items-center justify-center overflow-y-auto px-4 py-3">
        <div className="my-auto w-full max-w-[410px] shrink-0">
          <section className="relative w-full overflow-hidden rounded-[26px] border border-white/70 bg-white/85 px-5 pb-4 pt-5 shadow-[0_20px_70px_rgba(15,45,32,0.18)] backdrop-blur-2xl sm:px-7">
            <div className="relative z-10">
              {/* LOGO */}
              <Link
                to="/"
                className="mb-2 flex justify-center"
                aria-label="Credence home"
              >
                <img
                  src="/C-Logo.png"
                  alt="CREDENCE"
                  className="h-[48px] w-[48px] rounded-2xl object-contain drop-shadow-md"
                />
              </Link>

              {/* HEADING */}
              <div className="mb-4 text-center">
                <p className="mb-1 text-[10px] font-bold tracking-[0.2em] text-[#72917e]">
                  WELCOME BACK
                </p>
                <h1 className="text-[24px] font-bold tracking-tight text-[#142e23]">
                  Sign in to CREDENCE
                </h1>
              </div>

              {/* EMAIL/PASSWORD LOGIN */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between px-1">
                    <label
                      htmlFor="email"
                      className="text-xs font-semibold text-gray-600"
                    >
                      Email
                    </label>
                  </div>

                  <div className="relative">
                    <span className={iconClass}>
                      <svg
                        className="h-[18px] w-[18px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="m3 7 9 6 9-6" />
                      </svg>
                    </span>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder=" "
                      required
                      maxLength={150}
                      autoComplete="email"
                      className={inputClass}
                    />

                    <label htmlFor="email" className={labelClass}>
                      Email address
                    </label>
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <div className="mb-1 flex items-center justify-between px-1">
                    <label
                      htmlFor="password"
                      className="text-xs font-semibold text-gray-600"
                    >
                      Password
                    </label>
                  </div>

                  <div className="relative">
                    <span className={iconClass}>
                      <svg
                        className="h-[18px] w-[18px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <rect x="4" y="10" width="16" height="11" rx="2" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        <path d="M12 14v3" />
                      </svg>
                    </span>

                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder=" "
                      required
                      autoComplete="current-password"
                      className={`${inputClass} pr-16`}
                    />

                    <label htmlFor="password" className={labelClass}>
                      Enter password
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-4 text-xs font-semibold text-[#315f4c] transition hover:text-emerald-800"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="mb-1 flex items-center justify-end px-1">
                  <Link
                    to="/forgot-password"
                    className="text-[14px] font-semibold text-[#1f4838] transition hover:text-black hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="mt-1 w-full rounded-xl border border-[#142e23] bg-gradient-to-b from-[#315f4c] to-[#193c2e] py-2.5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(25,60,46,0.20)] transition duration-200 hover:-translate-y-0.5 hover:from-[#244d3b] hover:to-[#102e22] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              {/* DIVIDER */}
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-[10px] font-medium text-gray-400">
                  OR SIGN IN WITH
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {/* GOOGLE SIGN IN */}
              <div className="relative flex min-h-[42px] w-full items-center justify-center">
                {googleLoading ? (
                  <div className="flex h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#315f4c]" />
                    Connecting to Google...
                  </div>
                ) : (
                  <div className="flex w-full justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => console.error('Google Login Failed')}
                      theme="outline"
                      size="large"
                      text="continue_with"
                      shape="rectangular"
                      width="320"
                    />
                  </div>
                )}
              </div>

              {/* CREATE ACCOUNT */}
              <p className="mb-0 mt-3 text-center text-xs text-gray-500">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  state={location.state}
                  className="font-bold text-[#315f4c] transition hover:text-emerald-800 hover:underline"
                >
                  Create account
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
