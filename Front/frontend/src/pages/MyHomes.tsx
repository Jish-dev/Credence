
import { useEffect, useRef, useState } from "react";
import {
    Plus,
    Home as HomeIcon,
    MapPin,
    QrCode,
    Download,
    Copy,
    Trash2,
    Loader2,
    RefreshCw,
    X,
    CheckCircle2,
    ShieldCheck,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import {
    getMyHomes,
    createHome,
    getHomeQR,
    deactivateHome,
    deleteHome,
} from "../services/homeService";

import type { Home } from "../services/homeService";

const MyHomes = () => {
    const [homes, setHomes] = useState<Home[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [homeName, setHomeName] = useState("");
    const [address, setAddress] = useState("");

    const [selectedHome, setSelectedHome] = useState<Home | null>(null);
    const [passportUrl, setPassportUrl] = useState("");
    const [qrLoading, setQrLoading] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const qrRef = useRef<HTMLCanvasElement>(null);

    const fetchHomes = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await getMyHomes();
            setHomes(data);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load homes."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHomes();
    }, []);

    const handleCreateHome = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!homeName.trim() || !address.trim()) {
            setError("Please enter the home name and address.");
            return;
        }

        try {
            setSubmitting(true);
            setError("");
            setMessage("");

            await createHome(homeName.trim(), address.trim());

            setHomeName("");
            setAddress("");
            setShowForm(false);

            setMessage("Your home has been registered successfully.");
            await fetchHomes();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to register home."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleGenerateQR = async (home: Home) => {
        try {
            setQrLoading(true);
            setError("");
            setMessage("");

            const url = await getHomeQR(home._id);

            setSelectedHome(home);
            setPassportUrl(url);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to generate QR code."
            );
        } finally {
            setQrLoading(false);
        }
    };

    const handleDownloadQR = () => {
        const canvas = qrRef.current;

        if (!canvas || !selectedHome) return;

        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");

        link.href = image;
        link.download = `${selectedHome.name.replace(/\s+/g, "-")}-passport.png`;

        link.click();
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(passportUrl);
            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch {
            setError("Unable to copy the passport link.");
        }
    };

    const handleDeactivate = async (home: Home) => {
        const confirmed = window.confirm(
            `Are you sure you want to deactivate the QR passport for "${home.name}"?`
        );

        if (!confirmed) return;

        try {
            setError("");
            setMessage("");

            await deactivateHome(home._id);

            if (selectedHome?._id === home._id) {
                setSelectedHome(null);
                setPassportUrl("");
            }

            setMessage("Home passport deactivated successfully.");
            await fetchHomes();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to deactivate passport."
            );
        }
    };

    const handleDelete = async (home: Home) => {
        const confirmed = window.confirm(
            `Permanently delete "${home.name}"? This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            setError("");
            setMessage("");

            await deleteHome(home._id);

            if (selectedHome?._id === home._id) {
                setSelectedHome(null);
                setPassportUrl("");
            }

            setMessage("Home deleted successfully.");
            await fetchHomes();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to delete home."
            );
        }
    };


    return (
        <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">

                {/* Header */}
                <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-emerald-600">
                            <ShieldCheck size={19} />
                            <span className="text-sm font-semibold">
                                CREDENCE SERVICE PASSPORT
                            </span>
                        </div>

                        <h1 className="text-3xl font-bold text-slate-900">
                            My Homes
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Manage your homes and their service history passports.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
                    >
                        {showForm ? <X size={18} /> : <Plus size={18} />}
                        {showForm ? "Close Form" : "Add New Home"}
                    </button>
                </div>

                {/* Notifications */}
                {message && (
                    <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                        <CheckCircle2 size={18} />
                        {message}
                    </div>
                )}

                {error && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Add Home Form */}
                {showForm && (
                    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-5 text-xl font-bold text-slate-900">
                            Register a New Home
                        </h2>

                        <form onSubmit={handleCreateHome} className="space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Home Name
                                </label>

                                <input
                                    type="text"
                                    value={homeName}
                                    onChange={(e) => setHomeName(e.target.value)}
                                    placeholder="Example: My Family Home"
                                    maxLength={100}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Home Address
                                </label>

                                <textarea
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Enter your complete home address"
                                    rows={3}
                                    maxLength={500}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                                {submitting && (
                                    <Loader2 size={18} className="animate-spin" />
                                )}
                                Register Home
                            </button>
                        </form>
                    </div>
                )}

                {/* Homes List */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-emerald-600" size={32} />
                    </div>
                ) : homes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                        <HomeIcon className="mx-auto mb-4 text-slate-400" size={48} />

                        <h2 className="text-xl font-semibold text-slate-800">
                            No Homes Registered
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Register your first home to create its Service Passport.
                        </p>

                        <button
                            onClick={() => setShowForm(true)}
                            className="mt-6 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
                        >
                            Register Your Home
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2">
                        {homes.map((home) => (
                            <div
                                key={home._id}
                                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                            >
                                <div className="mb-5 flex items-start justify-between">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                        <HomeIcon size={24} />
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${home.isActive
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-slate-100 text-slate-500"
                                            }`}
                                    >
                                        {home.isActive ? "Active" : "Deactivated"}
                                    </span>
                                </div>

                                <h2 className="text-xl font-bold text-slate-900">
                                    {home.name}
                                </h2>

                                <div className="mt-3 flex items-start gap-2 text-sm text-slate-500">
                                    <MapPin size={17} className="mt-0.5 shrink-0" />
                                    <p>{home.address}</p>
                                </div>

                                <p className="mt-4 text-xs text-slate-400">
                                    Registered on{" "}
                                    {new Date(home.createdAt).toLocaleDateString("en-IN")}
                                </p>

                                {/* Home Actions */}
                                <div className="mt-6 flex flex-wrap gap-3">
                                    {home.isActive ? (
                                        <>
                                            <button
                                                onClick={() => handleGenerateQR(home)}
                                                disabled={qrLoading}
                                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <QrCode size={17} />
                                                View QR
                                            </button>

                                            <button
                                                onClick={() => handleDeactivate(home)}
                                                className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 size={17} />
                                                Deactivate
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleDelete(home)}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                                        >
                                            <Trash2 size={17} />
                                            Delete Permanently
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* QR Modal */}
                {selectedHome && passportUrl && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">
                                        Service Passport
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {selectedHome.name}
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        setSelectedHome(null);
                                        setPassportUrl("");
                                    }}
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex justify-center rounded-xl bg-slate-50 p-6">
                                <QRCodeCanvas
                                    ref={qrRef}
                                    value={passportUrl}
                                    size={220}
                                    level="H"
                                    includeMargin
                                />
                            </div>

                            <p className="mt-4 text-center text-sm text-slate-500">
                                Scan this QR code to view the public service passport.
                                Full service history requires customer OTP approval.
                            </p>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleDownloadQR}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                                >
                                    <Download size={17} />
                                    Download
                                </button>

                                <button
                                    onClick={handleCopyLink}
                                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    {copied ? (
                                        <CheckCircle2 size={17} />
                                    ) : (
                                        <Copy size={17} />
                                    )}
                                    {copied ? "Copied" : "Copy Link"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );

};

export default MyHomes;
