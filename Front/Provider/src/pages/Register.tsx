
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { providerRegister } from "../services/authService";
import { User, Mail, Phone, LockKeyhole, Briefcase } from "lucide-react";

export default function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        category: "",
        title: "",
        location: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const response = await providerRegister(form);

            setSuccess(
                response.message ||
                "Registration submitted. Please wait for admin approval."
            );

            navigate("/pending-approval");
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Registration failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <div className="hidden lg:flex lg:w-1/2 bg-slate-950 p-14 flex-col justify-between text-white">
                <h1 className="text-3xl font-bold">
                    CREDENCE<span className="text-blue-500">.</span>
                </h1>

                <div className="max-w-lg">
                    <p className="text-blue-400 text-sm font-semibold tracking-widest mb-5">
                        JOIN OUR NETWORK
                    </p>
                    <h2 className="text-5xl font-bold leading-tight">
                        Turn your skills into opportunities.
                    </h2>
                    <p className="mt-6 text-slate-400 text-lg leading-8">
                        Create your provider account, connect with customers and grow your
                        service business through Credence.
                    </p>
                </div>

                <p className="text-slate-500 text-sm">
                    © 2026 CREDENCE. All rights reserved.
                </p>
            </div>

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="mb-8">
                        <p className="text-sm font-semibold text-blue-600 mb-3">
                            PROVIDER REGISTRATION
                        </p>
                        <h2 className="text-3xl font-bold text-slate-900">
                            Create your account
                        </h2>
                        <p className="text-slate-500 mt-2">
                            Enter your details to join Credence.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Full name
                            </label>
                            <div className="relative">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Your full name"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Email address
                            </label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="you@example.com"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Phone number
                            </label>
                            <div className="relative">
                                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    required
                                    placeholder="Phone number"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Service category
                            </label>
                            <div className="relative">
                                <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    name="category"
                                    value={form.category}
                                    onChange={handleChange}
                                    required
                                    className={inputClass}
                                >
                                    <option value="">Select category</option>
                                    <option value="Home Cleaning">Home Cleaning</option>
                                    <option value="Plumbing">Plumbing</option>
                                    <option value="Electrical Services">Electrical Services</option>
                                    <option value="Painting">Painting</option>
                                    <option value="Carpentry">Carpentry</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Service title
                            </label>
                            <input
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                required
                                placeholder="e.g. Professional Electrician"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Location
                            </label>

                            <input
                                name="location"
                                value={form.location}
                                onChange={handleChange}
                                required
                                placeholder="e.g. Malappuram, Kerala"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    minLength={8}
                                    placeholder="Create a password"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                            {loading ? "Creating account..." : "Create account"}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        Already registered?{" "}
                        <Link to="/" className="font-semibold text-blue-600 hover:text-blue-700">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
