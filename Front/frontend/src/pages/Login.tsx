
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const response = await api.post<LoginResponse>("/auth/login", {
        email: email.trim(),
        password,
      });

      if (response.data.user.role !== "customer") {
        setError("Please use the customer login.");
        return;
      }

      localStorage.setItem("credence_token", response.data.token);
      login(response.data.user);

      const destination = location.state?.from || "/";
      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
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

          <div className="mb-7">
            <p className="text-sm font-semibold text-[#72917e] mb-2">
              WELCOME BACK
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              Sign in to CREDENCE
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Access your account and manage your service bookings.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#315f4c] focus:ring-2 focus:ring-[#315f4c]/10"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#315f4c] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
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
              {loading ? "Signing in..." : "Sign in"}
            </button>

          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-[#315f4c] hover:underline"
            >
              Create account
            </Link>
          </p>

        </div>

      </div>
    </div>
  );
}
