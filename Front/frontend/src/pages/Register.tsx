
import { useState, type FormEvent, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { User } from "../api";
import { useAuth } from "../context/AuthContext";

type RegisterResponse = {
  success: boolean;
  message: string;
  token: string;
  user: User;
};

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post<RegisterResponse>("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });

      localStorage.setItem("credence_token", response.data.token);
      login(response.data.user);

      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed."
      );
    } finally {
      setLoading(false);
    }
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
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <img
          src="/login-bg.avif"
          alt=""
          className="h-full w-full object-cover object-center"
        />
      </div>

      {/* BACKGROUND OVERLAY */}
      <div className="pointer-events-none fixed inset-0 z-10 bg-[#0b2118]/30" />

      {/* REGISTER CONTENT */}
      <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto overscroll-contain px-4 py-4 sm:py-6">

        {/* CARD */}
        <div className="my-auto w-full max-w-[410px] shrink-0">

          <section className="relative w-full overflow-hidden rounded-[26px] border border-white/70 bg-white/85 px-5 pb-4 pt-5 shadow-[0_20px_70px_rgba(15,45,32,0.18)] backdrop-blur-2xl sm:px-7">

            {/* CARD DECORATION */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-200/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-teal-200/30 blur-3xl" />

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
                  CREATE ACCOUNT
                </p>

                <h1 className="text-[24px] font-bold tracking-tight text-[#142e23]">
                  Join CREDENCE
                </h1>
              </div>

              {/* REGISTRATION FORM */}
              <form onSubmit={handleSubmit} className="space-y-2">

                {/* FULL NAME */}
                <div className="relative">
                  <span className={iconClass}>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21a8 8 0 0 1 16 0" />
                    </svg>
                  </span>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder=" "
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    className={inputClass}
                  />

                  <label htmlFor="name" className={labelClass}>
                    Full name
                  </label>
                </div>

                {/* EMAIL */}
                <div className="relative">
                  <span className={iconClass}>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </span>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
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

                {/* PHONE */}
                <div className="relative">
                  <span className={iconClass}>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M5 3h4l2 5-3 2a16 16 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" />
                    </svg>
                  </span>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder=" "
                    maxLength={20}
                    autoComplete="tel"
                    className={inputClass}
                  />

                  <label htmlFor="phone" className={labelClass}>
                    Phone number
                  </label>
                </div>

                {/* PASSWORD */}
                <div className="relative">
                  <span className={iconClass}>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      <path d="M12 14v3" />
                    </svg>
                  </span>

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder=" "
                    required
                    minLength={6}
                    maxLength={100}
                    autoComplete="new-password"
                    className={`${inputClass} pr-16`}
                  />

                  <label htmlFor="password" className={labelClass}>
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-4 text-xs font-semibold text-[#315f4c] hover:text-emerald-800"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {/* CONFIRM PASSWORD */}
                <div className="relative">
                  <span className={iconClass}>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      <path d="M12 14v3" />
                    </svg>
                  </span>

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder=" "
                    required
                    autoComplete="new-password"
                    className={`${inputClass} pr-16`}
                  />

                  <label htmlFor="confirmPassword" className={labelClass}>
                    Confirm password
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute inset-y-0 right-4 text-xs font-semibold text-[#315f4c] hover:text-emerald-800"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {/* ERROR */}
                {error && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                    {error}
                  </div>
                )}

                {/* CREATE ACCOUNT BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 w-full rounded-xl border border-[#142e23] bg-gradient-to-b from-[#315f4c] to-[#193c2e] py-2.5 font-semibold text-white shadow-[0_5px_12px_rgba(25,60,46,0.20)] transition duration-200 hover:-translate-y-0.5 hover:from-[#244d3b] hover:to-[#102e22] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>

              </form>

              {/* SIGN IN LINK */}
              <p className="mb-0 mt-3 text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-bold text-[#315f4c] transition hover:text-emerald-800 hover:underline"
                >
                  Sign in
                </Link>
              </p>

              {/* TERMS */}
              <p className="mb-0 mt-3 text-center text-[11px] leading-4 text-gray-600">
                By continuing, you agree to CREDENCE's{" "}
                <Link to="/terms-policy" className="underline hover:text-black">
                  Terms and Privacy Policy
                </Link>
                .
              </p>

            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
