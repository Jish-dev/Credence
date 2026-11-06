
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileText,
  IndianRupee,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sun,
  Moon,
  UserRound,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/usAuth";
import api from "../services/api";

// =====================================================
// TYPES
// =====================================================

type Section =
  | "dashboard"
  | "bookings"
  | "availability"
  | "report"
  | "profile"
  | "earnings"
  | "help";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "rejected";

interface Booking {
  _id: string;
  serviceName: string;
  description?: string;
  bookingDate: string;
  bookingTime: string;
  amount: number;
  status: BookingStatus;
  paymentStatus?: string;
  location?: string;
  contactPhone?: string;
  createdAt?: string;
  customer?: {
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
    profileImage?: string;
  } | null;
}

interface ProviderInfo {
  name: string;
  category: string;
  profileImage?: string;
  verificationStatus: "pending" | "verified" | "rejected";
  status: string;
}

interface DashboardStats {
  totalBookings: number;
  pendingJobs: number;
  activeJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  rejectedJobs: number;
  totalEarnings: number;
}

interface DashboardData {
  stats: DashboardStats;
  provider: ProviderInfo;
  recentBookings: Booking[];
}

interface ProviderProfileData {
  _id?: string;
  name: string;
  title: string;
  category: string;
  categories: string[];
  providerType: "individual" | "business" | "company";
  location: string;
  city: string;
  area: string;
  address: string;
  experienceYears: number;
  bio: string;
  description: string;
  contact: string;
  contactPhone: string;
  email: string;
  startingPrice: number;
  profileImage: string;
  isAvailable: boolean;
  verificationStatus?: string;
  status?: string;
}

const emptyProfile: ProviderProfileData = {
  name: "",
  title: "",
  category: "",
  categories: [],
  providerType: "individual",
  location: "",
  city: "",
  area: "",
  address: "",
  experienceYears: 0,
  bio: "",
  description: "",
  contact: "",
  contactPhone: "",
  email: "",
  startingPrice: 0,
  profileImage: "",
  isAvailable: true,
};

const emptyStats: DashboardStats = {
  totalBookings: 0,
  pendingJobs: 0,
  activeJobs: 0,
  completedJobs: 0,
  cancelledJobs: 0,
  rejectedJobs: 0,
  totalEarnings: 0,
};

const emptyDashboard: DashboardData = {
  stats: emptyStats,
  provider: {
    name: "Provider",
    category: "Service Provider",
    verificationStatus: "pending",
    status: "draft",
  },
  recentBookings: [],
};

// =====================================================
// DESIGN TOKENS
// =====================================================

const card = "rounded-[20px] border border-[#E4EAE8] bg-white p-5 sm:p-6";
const focusRing =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0F766E]/25";
const btnPrimary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 text-sm font-semibold text-white transition hover:bg-[#0B5F58] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const btnGhost = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E4EAE8] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-[#E9F1EF] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const inputClass = `w-full min-h-11 rounded-xl border border-[#D5DEDB] bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0F766E] focus:ring-4 focus:ring-[#0F766E]/15`;

const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-900 ring-amber-600/20",
  unpaid: "bg-amber-50 text-amber-900 ring-amber-600/20",
  confirmed: "bg-teal-50 text-teal-900 ring-teal-600/20",
  "in-progress": "bg-sky-50 text-sky-900 ring-sky-600/20",
  completed: "bg-green-50 text-green-900 ring-green-600/20",
  paid: "bg-green-50 text-green-900 ring-green-600/20",
  rejected: "bg-rose-50 text-rose-900 ring-rose-600/20",
  cancelled: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

const navGroups: {
  title: string;
  items: { id: Section; label: string; icon: typeof LayoutDashboard }[];
}[] = [
  {
    title: "Workspace",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "bookings", label: "Bookings", icon: CalendarCheck },
      { id: "availability", label: "Availability", icon: Clock3 },
      { id: "report", label: "Report", icon: BarChart3 },
    ],
  },
  {
    title: "Account",
    items: [
      { id: "profile", label: "My Profile", icon: UserRound },
      { id: "earnings", label: "Earnings", icon: Wallet },
      { id: "help", label: "Help & Support", icon: LifeBuoy },
    ],
  },
];

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "support@credence.com";
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || "";

const faqs = [
  {
    q: "How do I accept or reject a booking request?",
    a: "Open Bookings, find the request marked Pending and choose Accept or Reject. You can also open the booking to read the customer's notes first. Accepted bookings move to Confirmed.",
  },
  {
    q: "What do the booking statuses mean?",
    a: "Pending means a new request is waiting for you. Confirmed means you accepted it. In progress means the service has started. Completed means the job is finished. Rejected and Cancelled bookings need no further action.",
  },
  {
    q: "When do earnings appear in my total?",
    a: "A job counts towards Total earnings once it is Completed and its payment is marked Paid. Completed jobs that are not yet paid show up as Pending payout on the Earnings page.",
  },
  {
    q: "How do I update my service details or photo?",
    a: "Go to My Profile, edit your details and upload a profile image, then press Save changes. Your image is only applied after you save.",
  },
  {
    q: "How do I set the days and hours I work?",
    a: "Open Availability, choose your working days and start and end times. Note that schedule changes are not saved to your account yet and reset when you refresh the page.",
  },
  {
    q: "Why is my verification still pending?",
    a: "Verification is reviewed by the CREDENCE team. Make sure your profile name, category, contact number and photo are complete, then contact support if it stays pending for several days.",
  },
];

const supportTopics = ["Bookings", "Payments & earnings", "Profile & verification", "Technical problem", "Something else"];

// =====================================================
// HELPERS
// =====================================================

function money(value?: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getErrorMessage(error: unknown) {
  const err = error as { response?: { data?: { message?: string } }; message?: string };
  return err.response?.data?.message || err.message || "Something went wrong.";
}

function isPaid(b: Booking) {
  return b.status === "completed" && String(b.paymentStatus || "").toLowerCase() === "paid";
}

function percent(part: number, whole: number) {
  return whole ? `${Math.round((part / whole) * 100)}%` : "—";
}

/** Last six calendar months, oldest first. */
function monthlySeries(bookings: Booking[]) {
  const now = new Date();
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      name: d.toLocaleString("en-IN", { month: "short" }),
      bookings: 0,
      earnings: 0,
    };
  });
  for (const b of bookings) {
    const d = new Date(b.bookingDate);
    if (Number.isNaN(d.getTime())) continue;
    const bucket = buckets.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (!bucket) continue;
    bucket.bookings += 1;
    if (isPaid(b)) bucket.earnings += Number(b.amount) || 0;
  }
  return buckets;
}

function downloadCsv(bookings: Booking[]) {
  const header = ["Booking ID", "Customer", "Service", "Date", "Time", "Amount", "Status", "Payment"];
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = bookings.map((b) =>
    [b._id, b.customer?.name, b.serviceName, formatDate(b.bookingDate), b.bookingTime, b.amount, b.status, b.paymentStatus].map(cell).join(",")
  );
  const blob = new Blob([[header.map(cell).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `credence-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function unwrapProfile(payload: any): ProviderProfileData {
  const data = payload?.data ?? payload;
  const provider = data?.provider ?? data;
  return {
    ...emptyProfile,
    ...provider,
    categories: Array.isArray(provider?.categories) ? provider.categories : [],
    experienceYears: Number(provider?.experienceYears ?? 0),
    startingPrice: Number(provider?.startingPrice ?? 0),
  };
}

function unwrapDashboard(payload: any): DashboardData {
  const data = payload?.dashboard ?? payload?.data?.dashboard ?? payload?.data ?? payload;
  const s = data?.statistics ?? data?.stats ?? {};
  return {
    stats: {
      totalBookings: Number(s.totalBookings ?? 0),
      pendingJobs: Number(s.pendingJobs ?? 0),
      activeJobs: Number(s.activeJobs ?? 0),
      completedJobs: Number(s.completedJobs ?? 0),
      cancelledJobs: Number(s.cancelledJobs ?? 0),
      rejectedJobs: Number(s.rejectedJobs ?? 0),
      totalEarnings: Number(s.totalEarnings ?? 0),
    },
    provider: {
      name: data?.provider?.name || "Provider",
      category: data?.provider?.category || "Service Provider",
      profileImage: data?.provider?.profileImage,
      verificationStatus: data?.provider?.verificationStatus || "pending",
      status: data?.provider?.status || "draft",
    },
    recentBookings: Array.isArray(data?.recentBookings) ? data.recentBookings : [],
  };
}

// =====================================================
// REUSABLE UI
// =====================================================

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0F766E]">{eyebrow}</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-[#14211F]">{title}</h1>
        <p className="mt-1 text-sm text-[#55625F]">{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
        statusColors[status] || "bg-slate-100 text-slate-700 ring-slate-500/20"
      }`}
    >
      {status.replace("-", " ")}
    </span>
  );
}

function Avatar({ src, name, size = 40 }: { src?: string; name?: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#0F766E] text-sm font-semibold text-white"
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : (name?.charAt(0) || "P").toUpperCase()}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  htmlFor,
  children,
}: {
  label: string;
  icon?: typeof UserRound;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="flex items-center gap-2 text-xs font-semibold text-[#33413E]">
        {Icon && <Icon size={14} className="text-[#0F766E]" aria-hidden="true" />}
        {label}
      </label>
      {children}
    </div>
  );
}

function FormCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={card}>
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#E9F1EF] text-[#0F766E]">
          <Icon size={20} aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-semibold text-[#14211F]">{title}</h3>
          <p className="mt-0.5 text-xs text-[#55625F]">{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function StatCard({ label, value, note, hero }: { label: string; value: ReactNode; note?: string; hero?: boolean }) {
  return (
    <div className={`rounded-[20px] border p-5 ${hero ? "border-[#0F766E] bg-[#0F766E] text-white" : "border-[#E4EAE8] bg-white"}`}>
      <p className={`text-sm font-medium ${hero ? "text-white" : "text-[#55625F]"}`}>{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {note && <p className={`mt-1 text-xs ${hero ? "text-[#CFE7E4]" : "text-[#55625F]"}`}>{note}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof CalendarDays; title: string; text: string }) {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#E9F1EF] text-[#0F766E]">
        <Icon size={25} aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm font-semibold text-[#14211F]">{title}</p>
      <p className="mt-1 text-xs text-[#55625F]">{text}</p>
    </div>
  );
}

function MonthlyChart({
  data,
  dataKey,
  name,
  loading,
  currency,
}: {
  data: { name: string; bookings: number; earnings: number }[];
  dataKey: "bookings" | "earnings";
  name: string;
  loading: boolean;
  currency?: boolean;
}) {
  if (loading) return <div className="grid h-full place-items-center text-xs text-[#55625F]">Loading chart...</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, left: currency ? 0 : -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4EAE8" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#55625F", fontSize: 12 }} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#55625F", fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: "#E9F1EF" }}
          formatter={(v: number) => (currency ? money(Number(v)) : v)}
          contentStyle={{ borderRadius: 12, border: "1px solid #E4EAE8", fontSize: 12 }}
        />
        <Bar dataKey={dataKey} name={name} fill="#0F766E" radius={[8, 8, 0, 0]} barSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E4EAE8] bg-[#F7FAF9] p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#55625F]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#14211F]">{value}</p>
    </div>
  );
}

function BookingActionButtons({
  booking,
  busy,
  onUpdateStatus,
}: {
  booking: Booking;
  busy: boolean;
  onUpdateStatus: (id: string, status: BookingStatus) => void;
}) {
  const actions: { status: BookingStatus; label: string; className: string }[] =
    booking.status === "pending"
      ? [
          { status: "confirmed", label: "Accept", className: "bg-[#0F766E] text-white hover:bg-[#0B5F58]" },
          { status: "rejected", label: "Reject", className: "bg-rose-50 text-rose-800 hover:bg-rose-100" },
        ]
      : booking.status === "confirmed"
        ? [{ status: "in-progress", label: "Start service", className: "bg-[#0B4F4A] text-white hover:bg-[#093f3b]" }]
        : booking.status === "in-progress"
          ? [{ status: "completed", label: "Mark completed", className: "bg-[#0F766E] text-white hover:bg-[#0B5F58]" }]
          : [];

  if (!actions.length) return <p className="text-xs text-[#55625F]">No further actions available.</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.status}
          disabled={busy}
          onClick={() => onUpdateStatus(booking._id, action.status)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${focusRing} ${action.className}`}
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
          ) : action.status === "rejected" ? (
            <XCircle size={14} />
          ) : (
            <CheckCircle2 size={14} />
          )}
          {action.label}
        </button>
      ))}
    </div>
  );
}

function ProviderBookingsTable({
  bookings,
  loading,
  updatingBookingId,
  onView,
  onUpdateStatus,
}: {
  bookings: Booking[];
  loading: boolean;
  updatingBookingId: string | null;
  onView: (id: string) => void;
  onUpdateStatus: (id: string, status: BookingStatus) => void;
}) {
  if (loading)
    return (
      <div className="flex items-center justify-center gap-2 p-14 text-sm text-[#55625F]">
        <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" /> Loading your bookings...
      </div>
    );

  if (!bookings.length)
    return <EmptyState icon={CalendarDays} title="No bookings found" text="Customer booking requests will appear here." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left">
        <thead className="bg-[#F7FAF9]">
          <tr>
            {["Customer", "Service", "Date & time", "Amount", "Status", "Actions"].map((h) => (
              <th key={h} scope="col" className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#55625F]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking._id} className="border-t border-[#E4EAE8] transition-colors hover:bg-[#F7FAF9]">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <Avatar src={booking.customer?.profileImage} name={booking.customer?.name || "C"} size={36} />
                  <div>
                    <p className="text-sm font-semibold text-[#14211F]">{booking.customer?.name || "Customer"}</p>
                    <p className="mt-0.5 text-xs text-[#55625F]">
                      {booking.customer?.phone || booking.contactPhone || booking.customer?.email || "Contact not provided"}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-sm text-[#33413E]">{booking.serviceName || "Service"}</td>
              <td className="px-5 py-4 text-sm text-[#33413E]">
                <p>{formatDate(booking.bookingDate)}</p>
                <p className="mt-0.5 text-xs text-[#55625F]">{booking.bookingTime || "—"}</p>
              </td>
              <td className="px-5 py-4 text-sm font-semibold text-[#14211F]">{money(booking.amount)}</td>
              <td className="px-5 py-4"><StatusPill status={booking.status} /></td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => onView(booking._id)} className={`${btnGhost} !px-3 text-xs`}>
                    <Eye size={14} /> View
                  </button>
                  <BookingActionButtons booking={booking} busy={updatingBookingId === booking._id} onUpdateStatus={onUpdateStatus} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =====================================================
// MAIN PROVIDER PORTAL
// =====================================================

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try { return localStorage.getItem("credence-provider-theme") === "dark" ? "dark" : "light"; }
    catch { return "light"; }
  });
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [providerBookings, setProviderBookings] = useState<Booking[]>([]);
  const [providerBookingsLoading, setProviderBookingsLoading] = useState(false);
  const [providerBookingsError, setProviderBookingsError] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProviderProfileData>(emptyProfile);
  const [initialProfile, setInitialProfile] = useState<ProviderProfileData>(emptyProfile);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  // Local UI state only — no availability endpoint exists yet.
  const [workingDays, setWorkingDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  // Report + help UI state
  const [reportRange, setReportRange] = useState<"30" | "90" | "all">("30");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [supportTopic, setSupportTopic] = useState(supportTopics[0]);
  const [supportMessage, setSupportMessage] = useState("");

  const providerName = user?.name || dashboard.provider.name || "Provider";
  const stats = dashboard.stats;
  const currentGroup = navGroups.find((g) => g.items.some((i) => i.id === activeSection)) ?? navGroups[0];
  const currentNav = currentGroup.items.find((i) => i.id === activeSection) ?? navGroups[0].items[0];

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }, []);

  // ---------- data fetching ----------

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/providers/dashboard");
      setDashboard(unwrapDashboard(response.data));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProviderBookings = useCallback(async () => {
    setProviderBookingsLoading(true);
    setProviderBookingsError("");
    try {
      const response = await api.get("/bookings/provider/my", { params: { page: 1, limit: 50 } });
      const payload = response.data?.data ?? response.data;
      const bookings = Array.isArray(payload?.bookings)
        ? payload.bookings
        : Array.isArray(payload?.data?.bookings)
          ? payload.data.bookings
          : [];
      setProviderBookings(bookings);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setProviderBookingsError(
        /invalid provider id/i.test(message)
          ? "The backend is treating the word 'provider' as an ID. Check bookingRoutes.ts: place /provider/my routes before any /:id route."
          : message
      );
    } finally {
      setProviderBookingsLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError("");
    try {
      const response = await api.get("/provider-auth/profile");
      const data = unwrapProfile(response.data);
      setProfile(data);
      setInitialProfile(data);
      setCategoryInput(data.categories.join(", "));
    } catch (err: unknown) {
      setProfileError(getErrorMessage(err));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("credence-provider-theme", theme); } catch { /* storage may be unavailable */ }
  }, [theme]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  // Bookings feed the dashboard earnings chart, Bookings, Report and Earnings.
  useEffect(() => {
    if (["dashboard", "bookings", "report", "earnings"].includes(activeSection)) void fetchProviderBookings();
  }, [activeSection, fetchProviderBookings]);

  // Profile feeds My Profile and pre-fills the support email.
  useEffect(() => {
    if (["profile", "help"].includes(activeSection) && !profile._id && !profile.name) void fetchProfile();
  }, [activeSection, fetchProfile, profile._id, profile.name]);

  useEffect(() => {
    if (!selectedBooking) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedBooking(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedBooking]);

  // ---------- booking actions ----------

  async function viewBookingDetails(bookingId: string) {
    try {
      const response = await api.get(`/bookings/provider/my/${bookingId}`);
      const payload = response.data?.data ?? response.data;
      const booking = payload?.booking ?? payload?.data?.booking;
      if (booking) setSelectedBooking(booking);
      else notify("Booking details could not be loaded.");
    } catch (err: unknown) {
      notify(getErrorMessage(err));
    }
  }

  async function updateBookingStatus(bookingId: string, status: BookingStatus) {
    const actionLabels: Record<string, string> = {
      confirmed: "accept this booking",
      rejected: "reject this booking",
      "in-progress": "start this service",
      completed: "complete this service",
    };
    if (!window.confirm(`Are you sure you want to ${actionLabels[status] || "update this booking"}?`)) return;

    setUpdatingBookingId(bookingId);
    try {
      const response = await api.patch(`/bookings/provider/${bookingId}/status`, { status });
      const payload = response.data?.data ?? response.data;
      const updatedBooking = payload?.booking ?? payload?.data?.booking;
      setProviderBookings((current) =>
        current.map((b) => (b._id === bookingId ? { ...b, ...(updatedBooking || {}), status } : b))
      );
      setSelectedBooking((current) =>
        current?._id === bookingId ? { ...current, ...(updatedBooking || {}), status } : current
      );
      await fetchDashboard();
      notify(payload?.message || `Booking ${status.replace("-", " ")} successfully.`);
    } catch (err: unknown) {
      notify(getErrorMessage(err));
    } finally {
      setUpdatingBookingId(null);
    }
  }

  // ---------- profile actions ----------

  function updateProfileField(field: keyof ProviderProfileData, value: string | number | boolean) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function updateProfileCategories(value: string) {
    setCategoryInput(value);
    setProfile((current) => ({
      ...current,
      categories: value.split(",").map((item) => item.trim()).filter(Boolean),
    }));
  }

  function resetProfile() {
    setProfile(initialProfile);
    setCategoryInput(initialProfile.categories.join(", "));
    setProfileError("");
  }

  // Cloudinary unsigned upload. Needs VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.
  async function handleProfileImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImageUploadError("");
    if (!file.type.startsWith("image/")) {
      setImageUploadError("Please choose an image file (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError("Image size must be 5 MB or less.");
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      setImageUploadError("Cloudinary is not configured. Add the cloud name and unsigned upload preset to your frontend .env file.");
      return;
    }

    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", "credence/providers");

      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const result = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(result?.error?.message || "Cloudinary image upload failed.");
      if (!result?.secure_url) throw new Error("Cloudinary did not return a secure image URL.");

      updateProfileField("profileImage", result.secure_url);
      notify("Profile image uploaded. Save your profile to apply the change.");
    } catch (err: unknown) {
      setImageUploadError(getErrorMessage(err));
    } finally {
      setImageUploading(false);
    }
  }

  async function saveProfile() {
    setProfileSaving(true);
    setProfileError("");
    try {
      const payload = {
        name: profile.name.trim(),
        title: profile.title.trim(),
        category: profile.category.trim(),
        categories: profile.categories,
        providerType: profile.providerType,
        location: profile.location.trim(),
        city: profile.city.trim(),
        area: profile.area.trim(),
        address: profile.address.trim(),
        experienceYears: Number(profile.experienceYears) || 0,
        bio: profile.bio.trim(),
        description: profile.description.trim(),
        contactPhone: profile.contactPhone.trim() || profile.contact.trim(),
        startingPrice: Number(profile.startingPrice) || 0,
        profileImage: profile.profileImage,
      };

      if (!payload.name || !payload.category) {
        setProfileError("Provider name and main category are required.");
        return;
      }

      const response = await api.put("/provider-auth/profile", payload);
      const saved = unwrapProfile(response.data);
      setProfile(saved);
      setInitialProfile(saved);
      setCategoryInput(saved.categories.join(", "));
      setDashboard((current) => ({
        ...current,
        provider: {
          ...current.provider,
          name: saved.name || current.provider.name,
          category: saved.category || current.provider.category,
          profileImage: saved.profileImage || current.provider.profileImage,
        },
      }));
      notify(response.data?.message || "Profile updated successfully.");
    } catch (err: unknown) {
      setProfileError(getErrorMessage(err));
    } finally {
      setProfileSaving(false);
    }
  }

  // ---------- support ----------

  function sendSupportMessage() {
    const subject = `[${supportTopic}] Provider support request - ${providerName}`;
    const body = `${supportMessage.trim()}\n\n--\nProvider: ${providerName}\nAccount email: ${profile.email || "not loaded"}`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    notify("Opening your email app...");
  }

  // ---------- navigation ----------

  function handleLogout() {
    if (!window.confirm("Are you sure you want to logout?")) return;
    logout();
    navigate("/", { replace: true });
  }

  function changeSection(section: Section) {
    setActiveSection(section);
    setMobileNav(false);
  }

  function toggleWorkingDay(day: string) {
    setWorkingDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));
  }

  // ---------- derived data ----------

  const chartData = useMemo(
    () => [
      { name: "Pending", bookings: stats.pendingJobs },
      { name: "Active", bookings: stats.activeJobs },
      { name: "Completed", bookings: stats.completedJobs },
      { name: "Cancelled", bookings: stats.cancelledJobs },
      { name: "Rejected", bookings: stats.rejectedJobs },
    ],
    [stats]
  );

  const filteredBookings = useMemo(() => {
    const query = bookingSearch.trim().toLowerCase();
    return providerBookings.filter((booking) => {
      const matchesFilter = bookingFilter === "all" || booking.status === bookingFilter;
      const matchesSearch =
        !query ||
        booking.customer?.name?.toLowerCase().includes(query) ||
        booking.serviceName?.toLowerCase().includes(query) ||
        booking._id.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [providerBookings, bookingFilter, bookingSearch]);

  // Report: range-filtered metrics
  const rangeBookings = useMemo(() => {
    if (reportRange === "all") return providerBookings;
    const cutoff = Date.now() - Number(reportRange) * 24 * 60 * 60 * 1000;
    return providerBookings.filter((b) => {
      const t = new Date(b.bookingDate).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    });
  }, [providerBookings, reportRange]);

  const report = useMemo(() => {
    const count = (s: BookingStatus) => rangeBookings.filter((b) => b.status === s).length;
    const total = rangeBookings.length;
    const completed = count("completed");
    const accepted = count("confirmed") + count("in-progress") + completed;
    const rejected = count("rejected");
    const paid = rangeBookings.filter(isPaid);
    const revenue = paid.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    const byService = new Map<string, { bookings: number; revenue: number }>();
    for (const b of rangeBookings) {
      const key = b.serviceName || "Service";
      const row = byService.get(key) ?? { bookings: 0, revenue: 0 };
      row.bookings += 1;
      if (isPaid(b)) row.revenue += Number(b.amount) || 0;
      byService.set(key, row);
    }

    return {
      total,
      completionRate: percent(completed, total),
      responseRate: percent(accepted, accepted + rejected),
      cancellationRate: percent(count("cancelled"), total),
      avgValue: paid.length ? money(Math.round(revenue / paid.length)) : "—",
      statuses: [
        { label: "Pending", value: count("pending"), bar: "bg-amber-500" },
        { label: "Confirmed", value: count("confirmed"), bar: "bg-teal-500" },
        { label: "In progress", value: count("in-progress"), bar: "bg-sky-600" },
        { label: "Completed", value: completed, bar: "bg-[#0F766E]" },
        { label: "Rejected", value: rejected, bar: "bg-rose-500" },
        { label: "Cancelled", value: count("cancelled"), bar: "bg-slate-400" },
      ],
      services: [...byService.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5),
    };
  }, [rangeBookings]);

  const monthly = useMemo(() => monthlySeries(providerBookings), [providerBookings]);

  // Earnings: computed from loaded bookings
  const earnings = useMemo(() => {
    const paid = providerBookings.filter(isPaid);
    const awaiting = providerBookings.filter((b) => b.status === "completed" && !isPaid(b));
    const sum = (list: Booking[]) => list.reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const now = new Date();
    const thisMonth = paid.filter((b) => {
      const d = new Date(b.bookingDate);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    return {
      paidCount: paid.length,
      thisMonth: sum(thisMonth),
      pendingPayout: sum(awaiting),
      awaitingCount: awaiting.length,
      avg: paid.length ? Math.round(sum(paid) / paid.length) : 0,
      recent: providerBookings.filter((b) => b.status === "completed").slice(0, 10),
    };
  }, [providerBookings]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const kpis = [
    { label: "Total earnings", value: money(stats.totalEarnings), note: "Paid, completed jobs", icon: IndianRupee, hero: true },
    { label: "Total bookings", value: stats.totalBookings, note: "All booking requests", icon: CalendarCheck },
    { label: "Pending requests", value: stats.pendingJobs, note: "Waiting for your response", icon: Clock3 },
    { label: "Completed jobs", value: stats.completedJobs, note: "Successfully finished", icon: CheckCircle2 },
  ];

  const bookingsError = providerBookingsError && (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <AlertCircle size={17} />
      <span className="min-w-0 flex-1">{providerBookingsError}</span>
      <button onClick={() => void fetchProviderBookings()} className={`${btnGhost} text-xs`}>Retry</button>
    </div>
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className={`provider-dashboard-theme min-h-screen antialiased md:grid md:grid-cols-[260px_minmax(0,1fr)] ${theme === "dark" ? "provider-theme-dark" : "provider-theme-light"}`}>
      <style>{`
        .provider-dashboard-theme { background: #F2F6F5; color: #14211F; transition: background .2s ease, color .2s ease; }
        .provider-theme-dark { background: #101918 !important; color: #E7EFED !important; color-scheme: dark; }
        .provider-theme-dark [class*="bg-white"], .provider-theme-dark [class*="bg-[#F2F6F5]"], .provider-theme-dark [class*="bg-[#F7FAF9]"], .provider-theme-dark [class*="bg-[#E9F1EF]"] { background-color: #192523 !important; }
        .provider-theme-dark [class*="border-[#E4EAE8]"], .provider-theme-dark [class*="border-[#D5DEDB]"] { border-color: #30413D !important; }
        .provider-theme-dark [class*="text-[#14211F]"], .provider-theme-dark [class*="text-[#33413E]"], .provider-theme-dark [class*="text-slate-700"], .provider-theme-dark [class*="text-slate-800"] { color: #E7EFED !important; }
        .provider-theme-dark [class*="text-[#55625F]"], .provider-theme-dark [class*="text-slate-500"], .provider-theme-dark [class*="text-slate-600"] { color: #A8B8B3 !important; }
        .provider-theme-dark input, .provider-theme-dark textarea, .provider-theme-dark select { background-color: #192523 !important; color: #E7EFED !important; border-color: #40534E !important; }
        .provider-theme-dark table thead { background-color: #192523 !important; }
        .provider-theme-dark tr:hover { background-color: #20312D !important; }
        .provider-theme-dark header { background-color: rgba(25,37,35,.92) !important; border-color: #30413D !important; }
        .provider-theme-dark aside { background-color: #172320 !important; border-color: #30413D !important; }
        .provider-theme-dark .text-white { color: #fff !important; }
      `}</style>
      <AnimatePresence>
        {mobileNav && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileNav(false)}
            className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col overflow-y-auto border-r border-[#E4EAE8] bg-white px-4 py-6 transition-transform duration-200 motion-reduce:transition-none md:sticky md:top-0 md:h-screen md:w-auto md:translate-x-0 ${
          mobileNav ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3 px-2">
          <img src="/C-Logo.png" alt="" className="h-10 w-10 rounded-xl object-contain" />
          <div>
            <p className="text-lg font-bold leading-none tracking-tight">CREDENCE</p>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-[#0F766E]">PROVIDER PORTAL</p>
          </div>
          <button
            onClick={() => setMobileNav(false)}
            className={`ml-auto grid h-11 w-11 place-items-center rounded-xl text-slate-500 md:hidden ${focusRing}`}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>

        {navGroups.map((group) => (
          <nav key={group.title} aria-label={group.title} className="mt-8">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#55625F]">{group.title}</p>
            <div className="space-y-1">
              {group.items.map(({ id, label, icon: Icon }) => {
                const active = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => changeSection(id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-sm transition-colors motion-reduce:transition-none ${focusRing} ${
                      active ? "bg-[#0F766E] font-semibold text-white" : "text-[#33413E] hover:bg-[#E9F1EF]"
                    }`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                    {id === "bookings" && stats.pendingJobs > 0 && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? "bg-white text-[#0F766E]" : "bg-amber-100 text-amber-900"}`}>
                        {stats.pendingJobs}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        ))}

        <div className="mt-auto space-y-3 pt-8">
          <div className="flex items-center gap-3 rounded-2xl bg-[#F2F6F5] p-3">
            <Avatar src={dashboard.provider.profileImage} name={providerName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{providerName}</p>
              <p className="truncate text-xs text-[#55625F]">{dashboard.provider.category}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm text-[#33413E] transition hover:bg-rose-50 hover:text-rose-800 ${focusRing}`}
          >
            <LogOut size={17} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="min-w-0">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b border-[#E4EAE8] bg-white/85 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className={`grid h-11 w-11 place-items-center rounded-xl border border-[#E4EAE8] md:hidden ${focusRing}`}
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-xs text-[#55625F]">{currentGroup.title}</p>
              <p className="text-sm font-semibold">{currentNav.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              className={`grid h-11 w-11 place-items-center rounded-full border border-[#E4EAE8] bg-white text-slate-600 transition hover:bg-[#E9F1EF] ${focusRing}`}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              onClick={() => changeSection("bookings")}
              aria-label={`Notifications: ${stats.pendingJobs} pending requests`}
              className={`relative grid h-11 w-11 place-items-center rounded-full border border-[#E4EAE8] bg-white text-slate-600 transition hover:bg-[#E9F1EF] ${focusRing}`}
            >
              <Bell size={18} />
              {stats.pendingJobs > 0 && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />}
            </button>
            <div className="hidden items-center gap-3 sm:flex">
              <Avatar src={dashboard.provider.profileImage} name={providerName} size={44} />
              <div>
                <p className="text-sm font-semibold leading-tight">{providerName}</p>
                <p className="text-xs text-[#55625F]">Service provider</p>
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-[1280px] space-y-6 p-4 sm:p-7 xl:p-8"
          >
            {error && (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                <XCircle size={17} />
                <span className="min-w-0 flex-1">{error}</span>
                <button onClick={() => void fetchDashboard()} className={`${btnGhost} text-xs`}>Retry</button>
              </div>
            )}

            {/* ============ DASHBOARD ============ */}
            {activeSection === "dashboard" && (
              <>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">{greeting}, {providerName.split(" ")[0]}</h1>
                    <p className="mt-1 text-sm text-[#55625F]">
                      {stats.pendingJobs > 0
                        ? `${stats.pendingJobs} booking request${stats.pendingJobs > 1 ? "s" : ""} waiting for your response.`
                        : "You're all caught up. New requests will appear here."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden items-center gap-2 rounded-xl border border-[#E4EAE8] bg-white px-4 py-3 text-sm font-medium text-[#33413E] sm:flex">
                      <CalendarDays size={16} className="text-[#0F766E]" aria-hidden="true" />
                      {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    <button onClick={() => void fetchDashboard()} disabled={loading} className={btnGhost} aria-label="Refresh dashboard">
                      <RefreshCw size={16} className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>
                </div>

                <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {kpis.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`rounded-[20px] border p-5 ${item.hero ? "border-[#0F766E] bg-[#0F766E] text-white" : "border-[#E4EAE8] bg-white"}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${item.hero ? "text-white" : "text-[#55625F]"}`}>{item.label}</p>
                          <span className={`grid h-10 w-10 place-items-center rounded-xl ${item.hero ? "bg-white/15" : "bg-[#E9F1EF] text-[#0F766E]"}`}>
                            <Icon size={19} aria-hidden="true" />
                          </span>
                        </div>
                        <p className="mt-4 text-3xl font-bold tracking-tight">{loading ? "—" : item.value}</p>
                        <p className={`mt-1 text-xs ${item.hero ? "text-[#CFE7E4]" : "text-[#55625F]"}`}>{item.note}</p>
                      </motion.div>
                    );
                  })}
                </section>

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
                  <div className="min-w-0 space-y-5">
                    <section className={card}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold">Upcoming bookings</h2>
                          <p className="mt-1 text-xs text-[#55625F]">Your latest customer requests</p>
                        </div>
                        <button onClick={() => changeSection("bookings")} className={`inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-[#0F766E] hover:underline ${focusRing}`}>
                          View all <ArrowUpRight size={15} />
                        </button>
                      </div>
                      <div className="mt-3">
                        {loading ? (
                          <div className="py-12 text-center text-sm text-[#55625F]">
                            <RefreshCw className="mx-auto mb-2 animate-spin motion-reduce:animate-none" size={18} />
                            Loading bookings...
                          </div>
                        ) : dashboard.recentBookings.length ? (
                          <ul>
                            {dashboard.recentBookings.slice(0, 5).map((booking) => {
                              const d = new Date(booking.bookingDate);
                              return (
                                <li key={booking._id} className="border-t border-[#E4EAE8] first:border-t-0">
                                  <button
                                    onClick={() => void viewBookingDetails(booking._id)}
                                    className={`flex min-h-[64px] w-full items-center gap-4 rounded-xl py-3 text-left transition hover:bg-[#F7FAF9] ${focusRing}`}
                                  >
                                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#E9F1EF] text-center leading-none">
                                      <div>
                                        <p className="text-base font-bold text-[#0B4F4A]">{Number.isNaN(d.getTime()) ? "—" : d.getDate()}</p>
                                        <p className="mt-0.5 text-[10px] font-semibold uppercase text-[#55625F]">
                                          {Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-IN", { month: "short" })}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-semibold">{booking.serviceName || "Service booking"}</p>
                                      <p className="mt-0.5 truncate text-xs text-[#55625F]">
                                        {booking.customer?.name || "Customer"}
                                        {booking.bookingTime ? ` · ${booking.bookingTime}` : ""}
                                        {booking.location ? ` · ${booking.location}` : ""}
                                      </p>
                                    </div>
                                    <div className="hidden sm:block"><StatusPill status={booking.status} /></div>
                                    <ChevronRight size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <EmptyState icon={CalendarDays} title="No bookings yet" text="New customer requests will appear here." />
                        )}
                      </div>
                    </section>

                    <section className={card}>
                      <h2 className="text-base font-semibold">Bookings by status</h2>
                      <p className="mt-1 text-xs text-[#55625F]">Where your workload stands right now</p>
                      <div className="mt-5 h-56">
                        {loading ? (
                          <div className="grid h-full place-items-center text-xs text-[#55625F]">Loading overview...</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4EAE8" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#55625F", fontSize: 12 }} />
                              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#55625F", fontSize: 12 }} />
                              <Tooltip cursor={{ fill: "#E9F1EF" }} contentStyle={{ borderRadius: 12, border: "1px solid #E4EAE8", fontSize: 12 }} />
                              <Bar dataKey="bookings" name="Bookings" fill="#0F766E" radius={[8, 8, 0, 0]} barSize={32} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="min-w-0 space-y-5">
                    {stats.pendingJobs > 0 && (
                      <section className="flex items-center justify-between gap-3 rounded-[20px] border border-amber-200 bg-amber-50 p-5">
                        <div>
                          <p className="text-sm font-semibold text-amber-950">{stats.pendingJobs} pending request{stats.pendingJobs > 1 ? "s" : ""}</p>
                          <p className="mt-0.5 text-xs text-amber-900">Respond quickly to win the job.</p>
                        </div>
                        <button onClick={() => changeSection("bookings")} className={`${btnPrimary} shrink-0`}>Review</button>
                      </section>
                    )}

                    <section className={card}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold">Earnings overview</h2>
                          <p className="mt-1 text-xs text-[#55625F]">Paid earnings from the last six months</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => changeSection("earnings")}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#0F766E] transition hover:bg-[#E9F1EF]"
                        >
                          View details <ArrowUpRight size={14} />
                        </button>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs text-[#55625F]">Total in this period</p>
                          <p className="mt-1 text-2xl font-bold tracking-tight">
                            {money(monthly.reduce((total, item) => total + item.earnings, 0))}
                          </p>
                        </div>
                        <span className="rounded-lg bg-[#E9F1EF] px-2.5 py-1.5 text-[11px] font-semibold text-[#0F766E]">
                          Last 6 months
                        </span>
                      </div>

                      <div className="mt-4 h-52" role="img" aria-label="Bar chart showing paid earnings for the last six months">
                        {providerBookingsLoading ? (
                          <div className="grid h-full place-items-center text-xs text-[#55625F]">Loading earnings...</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthly} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4EAE8" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#55625F", fontSize: 11 }} />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#55625F", fontSize: 10 }}
                                tickFormatter={(value: number) => value >= 1000 ? `₹${Math.round(value / 1000)}k` : `₹${value}`}
                                width={42}
                              />
                              <Tooltip
                                formatter={(value: number) => [money(Number(value)), "Earnings"]}
                                contentStyle={{ borderRadius: 12, border: "1px solid #E4EAE8", fontSize: 12 }}
                              />
                              <Bar dataKey="earnings" name="Earnings" fill="#0F766E" radius={[7, 7, 0, 0]} barSize={25} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] text-[#87938F]">
                        Only completed bookings marked as paid are included.
                      </p>
                    </section>

                    <section className={card}>
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold">Provider status</h2>
                        <ShieldCheck size={19} className="text-[#0F766E]" aria-hidden="true" />
                      </div>
                      <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#F2F6F5] p-3.5">
                        <span className={`h-3 w-3 rounded-full ${dashboard.provider.verificationStatus === "verified" ? "bg-green-600" : "bg-amber-500"}`} aria-hidden="true" />
                        <div>
                          <p className="text-sm font-semibold capitalize">{dashboard.provider.verificationStatus}</p>
                          <p className="text-xs text-[#55625F]">Verification status</p>
                        </div>
                      </div>
                      <dl className="mt-3 text-sm">
                        <div className="flex justify-between border-b border-[#E4EAE8] py-3">
                          <dt className="text-[#55625F]">Listing</dt>
                          <dd className="font-semibold capitalize">{dashboard.provider.status}</dd>
                        </div>
                        <div className="flex justify-between py-3">
                          <dt className="text-[#55625F]">Category</dt>
                          <dd className="max-w-[60%] truncate font-semibold">{dashboard.provider.category}</dd>
                        </div>
                      </dl>
                      <button onClick={() => changeSection("profile")} className={`${btnPrimary} mt-1 w-full`}>Complete profile</button>
                    </section>

                    <section className={card}>
                      <h2 className="text-base font-semibold">Quick actions</h2>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {[
                          { label: "Bookings", icon: CalendarCheck, section: "bookings" as Section },
                          { label: "Availability", icon: Clock3, section: "availability" as Section },
                          { label: "Report", icon: BarChart3, section: "report" as Section },
                          { label: "Earnings", icon: Wallet, section: "earnings" as Section },
                        ].map(({ label, icon: Icon, section }) => (
                          <button key={label} onClick={() => changeSection(section)} className={`flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-xl border border-[#E4EAE8] text-xs font-semibold text-[#33413E] transition hover:bg-[#E9F1EF] ${focusRing}`}>
                            <Icon size={19} className="text-[#0F766E]" aria-hidden="true" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </>
            )}

            {/* ============ BOOKINGS ============ */}
            {activeSection === "bookings" && (
              <>
                <PageHeading
                  eyebrow="Workspace / Bookings"
                  title="Bookings"
                  description="Review requests, manage service progress and keep customers updated."
                  action={
                    <button onClick={() => void fetchProviderBookings()} disabled={providerBookingsLoading} className={btnGhost}>
                      <RefreshCw size={16} className={providerBookingsLoading ? "animate-spin motion-reduce:animate-none" : ""} /> Refresh
                    </button>
                  }
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="Total bookings" value={providerBookingsLoading ? "…" : providerBookings.length} />
                  <StatCard label="Pending requests" value={providerBookingsLoading ? "…" : providerBookings.filter((b) => b.status === "pending").length} />
                  <StatCard label="Active jobs" value={providerBookingsLoading ? "…" : providerBookings.filter((b) => ["confirmed", "in-progress"].includes(b.status)).length} />
                  <StatCard label="Completed" value={providerBookingsLoading ? "…" : providerBookings.filter((b) => b.status === "completed").length} />
                </div>

                {bookingsError}

                <section className="overflow-hidden rounded-[20px] border border-[#E4EAE8] bg-white">
                  <div className="flex flex-col gap-3 border-b border-[#E4EAE8] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                      <h2 className="text-base font-semibold">Booking requests</h2>
                      <p className="mt-1 text-xs text-[#55625F]">Bookings assigned to your provider account.</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative">
                        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                          value={bookingSearch}
                          onChange={(e) => setBookingSearch(e.target.value)}
                          placeholder="Search customer or service"
                          aria-label="Search bookings"
                          className={`${inputClass} pl-10 sm:w-64`}
                        />
                      </div>
                      <select
                        value={bookingFilter}
                        onChange={(e) => setBookingFilter(e.target.value)}
                        aria-label="Filter by status"
                        className={`${inputClass} sm:w-44`}
                      >
                        <option value="all">All statuses</option>
                        {["pending", "confirmed", "in-progress", "completed", "cancelled", "rejected"].map((s) => (
                          <option key={s} value={s}>{s.replace("-", " ")}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <ProviderBookingsTable
                    bookings={filteredBookings}
                    loading={providerBookingsLoading}
                    updatingBookingId={updatingBookingId}
                    onView={viewBookingDetails}
                    onUpdateStatus={updateBookingStatus}
                  />
                  <div className="border-t border-[#E4EAE8] px-5 py-3 text-xs text-[#55625F] sm:px-6">
                    Showing {filteredBookings.length} of {providerBookings.length} bookings loaded.
                  </div>
                </section>
              </>
            )}

            {/* ============ AVAILABILITY ============ */}
            {activeSection === "availability" && (
              <>
                <PageHeading
                  eyebrow="Workspace / Availability"
                  title="Availability"
                  description="Set your preferred working days and hours."
                />
                <section className={card}>
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#E9F1EF] text-[#0F766E]"><CalendarDays size={20} aria-hidden="true" /></div>
                    <div>
                      <h2 className="text-base font-semibold">Working days</h2>
                      <p className="mt-0.5 text-xs text-[#55625F]">Choose the days you usually accept bookings.</p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {weekdays.map((day) => {
                      const selected = workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => toggleWorkingDay(day)}
                          aria-pressed={selected}
                          className={`flex min-h-11 items-center justify-between rounded-xl border px-4 text-sm font-medium transition ${focusRing} ${
                            selected ? "border-[#0F766E] bg-[#E9F1EF] text-[#0B4F4A]" : "border-[#D5DEDB] bg-white text-[#55625F] hover:bg-[#F7FAF9]"
                          }`}
                        >
                          {day}
                          {selected ? <CheckCircle2 size={17} aria-hidden="true" /> : <span className="h-4 w-4 rounded-full border border-slate-300" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    <Field label="Start time" htmlFor="a-start">
                      <input id="a-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="End time" htmlFor="a-end">
                      <input id="a-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
                    </Field>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F2F6F5] p-4">
                    <div>
                      <p className="text-sm font-semibold">Your selected schedule</p>
                      <p className="mt-1 text-xs text-[#55625F]">
                        {workingDays.length ? workingDays.join(", ") : "No working days selected"} · {startTime} – {endTime}
                      </p>
                    </div>
                    <button
                      onClick={() => notify("Schedule preview updated. Connect an availability API to save it permanently.")}
                      disabled={!workingDays.length || startTime >= endTime}
                      className={btnPrimary}
                    >
                      <Save size={15} /> Save schedule
                    </button>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#55625F]">
                    Schedule selections are held in page state only and reset on refresh until an availability endpoint exists.
                  </p>
                </section>
              </>
            )}

            {/* ============ REPORT ============ */}
            {activeSection === "report" && (
              <>
                <PageHeading
                  eyebrow="Workspace / Report"
                  title="Performance report"
                  description="See how your bookings, response rate and services are performing."
                  action={
                    <div className="flex flex-wrap gap-2">
                      <select value={reportRange} onChange={(e) => setReportRange(e.target.value as "30" | "90" | "all")} aria-label="Report period" className={`${inputClass} !w-auto`}>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                        <option value="all">All loaded bookings</option>
                      </select>
                      <button onClick={() => downloadCsv(rangeBookings)} disabled={!rangeBookings.length} className={btnGhost}>
                        <Download size={16} /> Export CSV
                      </button>
                    </div>
                  }
                />

                {bookingsError}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard hero label="Bookings in period" value={providerBookingsLoading ? "…" : report.total} note="Based on booking date" />
                  <StatCard label="Completion rate" value={providerBookingsLoading ? "…" : report.completionRate} note="Completed ÷ all bookings" />
                  <StatCard label="Response rate" value={providerBookingsLoading ? "…" : report.responseRate} note="Accepted ÷ (accepted + rejected)" />
                  <StatCard label="Average job value" value={providerBookingsLoading ? "…" : report.avgValue} note="Paid, completed jobs" />
                </div>

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
                  <section className={card}>
                    <h2 className="text-base font-semibold">Bookings per month</h2>
                    <p className="mt-1 text-xs text-[#55625F]">Last six months</p>
                    <div className="mt-5 h-60">
                      <MonthlyChart data={monthly} dataKey="bookings" name="Bookings" loading={providerBookingsLoading} />
                    </div>
                  </section>

                  <section className={card}>
                    <h2 className="text-base font-semibold">Status breakdown</h2>
                    <p className="mt-1 text-xs text-[#55625F]">Bookings in the selected period</p>
                    <ul className="mt-5 space-y-4">
                      {report.statuses.map((s) => (
                        <li key={s.label}>
                          <div className="mb-1.5 flex justify-between text-sm">
                            <span className="text-[#33413E]">{s.label}</span>
                            <span className="font-semibold">{s.value}</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-[#E4EAE8]">
                            <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${report.total ? (s.value / report.total) * 100 : 0}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <section className="overflow-hidden rounded-[20px] border border-[#E4EAE8] bg-white">
                  <div className="border-b border-[#E4EAE8] p-5 sm:px-6">
                    <h2 className="text-base font-semibold">Top services</h2>
                    <p className="mt-1 text-xs text-[#55625F]">Most requested services in the selected period</p>
                  </div>
                  {report.services.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] text-left">
                        <thead className="bg-[#F7FAF9]">
                          <tr>
                            {["Service", "Bookings", "Earned"].map((h) => (
                              <th key={h} scope="col" className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#55625F] sm:px-6">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {report.services.map((s) => (
                            <tr key={s.name} className="border-t border-[#E4EAE8]">
                              <td className="px-5 py-4 text-sm font-semibold sm:px-6">{s.name}</td>
                              <td className="px-5 py-4 text-sm sm:px-6">{s.bookings}</td>
                              <td className="px-5 py-4 text-sm font-semibold sm:px-6">{money(s.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState icon={BarChart3} title="No data for this period" text="Try a longer period, or check back after you receive bookings." />
                  )}
                </section>
                <p className="text-xs text-[#55625F]">Report figures use your {providerBookings.length} most recent loaded bookings (up to 50).</p>
              </>
            )}

            {/* ============ PROFILE ============ */}
            {activeSection === "profile" && (
              <>
                <PageHeading
                  eyebrow="Account / Profile"
                  title="My Profile"
                  description="Keep your public service profile accurate and up to date."
                  action={
                    <div className="flex flex-wrap gap-2">
                      <button onClick={resetProfile} disabled={profileSaving || profileLoading} className={btnGhost}>Reset changes</button>
                      <button onClick={() => void saveProfile()} disabled={profileSaving || profileLoading} className={btnPrimary}>
                        {profileSaving ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" /> : <Save size={15} />}
                        {profileSaving ? "Saving..." : "Save changes"}
                      </button>
                    </div>
                  }
                />

                {profileError && (
                  <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                    <AlertCircle size={18} />
                    <span className="flex-1">{profileError}</span>
                    <button onClick={() => setProfileError("")} aria-label="Dismiss error" className={`grid h-11 w-11 place-items-center rounded-xl ${focusRing}`}><X size={16} /></button>
                  </div>
                )}

                {profileLoading ? (
                  <div className="grid min-h-[320px] place-items-center rounded-[20px] border border-[#E4EAE8] bg-white">
                    <div className="text-center">
                      <Loader2 size={32} className="mx-auto animate-spin motion-reduce:animate-none text-[#0F766E]" />
                      <p className="mt-3 text-sm font-medium text-[#55625F]">Loading your profile...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <section className="overflow-hidden rounded-[20px] border border-[#E4EAE8] bg-white">
                      <div className="flex flex-wrap items-center gap-5 bg-[#0B4F4A] p-6 text-white sm:p-8">
                        <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#0F766E] text-3xl font-bold ring-4 ring-white/15">
                          {profile.profileImage ? (
                            <img src={profile.profileImage} alt={profile.name || "Provider"} className="h-full w-full object-cover" />
                          ) : (
                            profile.name.charAt(0).toUpperCase() || "P"
                          )}
                          <button
                            type="button"
                            onClick={() => profileImageInputRef.current?.click()}
                            disabled={imageUploading}
                            className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-[#0B4F4A] bg-white text-[#0F766E] shadow disabled:opacity-50"
                            aria-label="Change profile photo"
                            title="Change profile photo"
                          >
                            {imageUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                          </button>
                          <input
                            ref={profileImageInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleProfileImageUpload}
                            disabled={imageUploading}
                            className="sr-only"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-2xl font-bold">{profile.name || "Your professional profile"}</h2>
                          <p className="mt-1 text-sm text-[#CFE7E4]">{profile.title || "Professional service provider"}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold capitalize">{profile.verificationStatus || "Verification unavailable"}</span>
                            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold capitalize">{profile.status || "Listing status unavailable"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
                        <Field label="Provider name" htmlFor="p-name">
                          <input id="p-name" className={inputClass} value={profile.name} onChange={(e) => updateProfileField("name", e.target.value)} placeholder="Enter provider name" />
                        </Field>
                        <Field label="Professional title" htmlFor="p-title">
                          <input id="p-title" className={inputClass} value={profile.title} onChange={(e) => updateProfileField("title", e.target.value)} placeholder="e.g. Professional Electrician" />
                        </Field>
                        <Field label="Provider type" htmlFor="p-type">
                          <select id="p-type" className={inputClass} value={profile.providerType} onChange={(e) => updateProfileField("providerType", e.target.value)}>
                            <option value="individual">Individual</option>
                            <option value="business">Business</option>
                            <option value="company">Company</option>
                          </select>
                        </Field>
                        <Field label="Experience (years)" htmlFor="p-exp">
                          <input id="p-exp" type="number" min="0" max="100" className={inputClass} value={profile.experienceYears} onChange={(e) => updateProfileField("experienceYears", Number(e.target.value))} />
                        </Field>
                      </div>
                    </section>

                    <FormCard icon={BriefcaseBusiness} title="Service information" subtitle="Tell customers about your services">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Main category" htmlFor="p-cat">
                          <input id="p-cat" className={inputClass} value={profile.category} onChange={(e) => updateProfileField("category", e.target.value)} placeholder="e.g. Home Services" />
                        </Field>
                        <Field label="Additional categories" htmlFor="p-cats">
                          <input id="p-cats" className={inputClass} value={categoryInput} onChange={(e) => updateProfileCategories(e.target.value)} placeholder="Plumbing, Electrical, Cleaning" />
                        </Field>
                        <Field label="Starting price (₹)" icon={IndianRupee} htmlFor="p-price">
                          <input id="p-price" type="number" min="0" className={inputClass} value={profile.startingPrice} onChange={(e) => updateProfileField("startingPrice", Number(e.target.value))} placeholder="500" />
                        </Field>
                        <Field label="Profile availability">
                          <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-[#D5DEDB] bg-[#F7FAF9] px-4 py-2.5">
                            <span className="text-sm font-medium">{profile.isAvailable ? "Available" : "Unavailable"}</span>
                            <input type="checkbox" checked={profile.isAvailable} onChange={(e) => updateProfileField("isAvailable", e.target.checked)} className="h-5 w-5 accent-[#0F766E]" />
                          </label>
                        </Field>
                        <div className="sm:col-span-2">
                          <Field label="Short bio" icon={FileText} htmlFor="p-bio">
                            <textarea id="p-bio" rows={3} maxLength={2000} className={`${inputClass} resize-none`} value={profile.bio} onChange={(e) => updateProfileField("bio", e.target.value)} placeholder="Write a short introduction about yourself..." />
                          </Field>
                        </div>
                        <div className="sm:col-span-2">
                          <Field label="Detailed description" htmlFor="p-desc">
                            <textarea id="p-desc" rows={4} maxLength={2000} className={`${inputClass} resize-none`} value={profile.description} onChange={(e) => updateProfileField("description", e.target.value)} placeholder="Describe your services, experience and what makes you different..." />
                          </Field>
                        </div>
                      </div>
                    </FormCard>

                    <FormCard icon={MapPin} title="Location details" subtitle="Where customers can find your service">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Location" htmlFor="p-loc">
                          <input id="p-loc" className={inputClass} value={profile.location} onChange={(e) => updateProfileField("location", e.target.value)} placeholder="e.g. Malappuram, Kerala" />
                        </Field>
                        <Field label="City" htmlFor="p-city">
                          <input id="p-city" className={inputClass} value={profile.city} onChange={(e) => updateProfileField("city", e.target.value)} placeholder="Enter city" />
                        </Field>
                        <Field label="Area" htmlFor="p-area">
                          <input id="p-area" className={inputClass} value={profile.area} onChange={(e) => updateProfileField("area", e.target.value)} placeholder="Enter area" />
                        </Field>
                        <Field label="Full address" htmlFor="p-addr">
                          <input id="p-addr" className={inputClass} value={profile.address} onChange={(e) => updateProfileField("address", e.target.value)} placeholder="Enter full address" />
                        </Field>
                      </div>
                    </FormCard>

                    <FormCard icon={Phone} title="Contact information" subtitle="Your business contact details">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Contact number" icon={Phone} htmlFor="p-phone">
                          <input
                            id="p-phone"
                            type="tel"
                            className={inputClass}
                            value={profile.contact}
                            onChange={(e) => { updateProfileField("contact", e.target.value); updateProfileField("contactPhone", e.target.value); }}
                            placeholder="Enter phone number"
                          />
                        </Field>
                        <Field label="Email address" icon={Mail} htmlFor="p-email">
                          <input id="p-email" type="email" className={inputClass} value={profile.email} onChange={(e) => updateProfileField("email", e.target.value)} placeholder="example@email.com" />
                        </Field>
                      </div>
                    </FormCard>

                    <FormCard icon={Camera} title="Profile image" subtitle="Upload an image from your device to Cloudinary">
                      <div className="grid items-center gap-6 sm:grid-cols-[112px_1fr]">
                        <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border border-[#E4EAE8] bg-[#F7FAF9]">
                          {profile.profileImage ? (
                            <img src={profile.profileImage} alt="Profile preview" className="h-full w-full object-cover" />
                          ) : (
                            <Camera size={30} className="text-slate-300" aria-hidden="true" />
                          )}
                        </div>
                        <div className="space-y-3">
                          <label className={`${btnPrimary} cursor-pointer ${imageUploading ? "pointer-events-none opacity-60" : ""}`}>
                            {imageUploading ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" /> : <Camera size={15} />}
                            {imageUploading ? "Uploading image..." : "Choose image"}
                            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleProfileImageUpload} disabled={imageUploading} className="sr-only" />
                          </label>
                          <p className="text-xs leading-5 text-[#55625F]">JPG, PNG or WEBP, up to 5 MB. After upload, save your profile to store the image.</p>
                          {imageUploadError && <p role="alert" className="text-xs font-medium text-rose-800">{imageUploadError}</p>}
                          {profile.profileImage && (
                            <button type="button" onClick={() => updateProfileField("profileImage", "")} className={`min-h-11 rounded-xl px-1 text-xs font-semibold text-rose-800 hover:underline ${focusRing}`}>
                              Remove selected image
                            </button>
                          )}
                        </div>
                      </div>
                    </FormCard>

                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
                      <button onClick={resetProfile} disabled={profileSaving} className={btnGhost}>Reset changes</button>
                      <button onClick={() => void saveProfile()} disabled={profileSaving} className={btnPrimary}>
                        {profileSaving ? <Loader2 size={17} className="animate-spin motion-reduce:animate-none" /> : <Check size={17} />}
                        {profileSaving ? "Saving profile..." : "Save profile"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ============ EARNINGS ============ */}
            {activeSection === "earnings" && (
              <>
                <PageHeading
                  eyebrow="Account / Earnings"
                  title="Earnings"
                  description="Track what you've earned and what's still waiting to be paid."
                  action={
                    <button onClick={() => { void fetchDashboard(); void fetchProviderBookings(); }} disabled={providerBookingsLoading || loading} className={btnGhost}>
                      <RefreshCw size={16} className={providerBookingsLoading || loading ? "animate-spin motion-reduce:animate-none" : ""} /> Refresh
                    </button>
                  }
                />

                {bookingsError}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard hero label="Total earnings" value={loading ? "…" : money(stats.totalEarnings)} note="Paid, completed jobs" />
                  <StatCard label="This month" value={providerBookingsLoading ? "…" : money(earnings.thisMonth)} note="Paid jobs this month" />
                  <StatCard label="Pending payout" value={providerBookingsLoading ? "…" : money(earnings.pendingPayout)} note={`${earnings.awaitingCount} completed job${earnings.awaitingCount === 1 ? "" : "s"} not yet paid`} />
                  <StatCard label="Average per job" value={providerBookingsLoading ? "…" : earnings.paidCount ? money(earnings.avg) : "—"} note={`${earnings.paidCount} paid job${earnings.paidCount === 1 ? "" : "s"}`} />
                </div>

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
                  <section className={card}>
                    <h2 className="text-base font-semibold">Earnings per month</h2>
                    <p className="mt-1 text-xs text-[#55625F]">Paid, completed jobs over the last six months</p>
                    <div className="mt-5 h-60">
                      <MonthlyChart data={monthly} dataKey="earnings" name="Earnings" loading={providerBookingsLoading} currency />
                    </div>
                  </section>

                  <section className={card}>
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#E9F1EF] text-[#0F766E]"><Wallet size={20} aria-hidden="true" /></div>
                      <h2 className="text-base font-semibold">How earnings work</h2>
                    </div>
                    <ol className="mt-5 space-y-4 text-sm text-[#33413E]">
                      {[
                        "Accept a booking and complete the service.",
                        "Once the job is marked Completed and the customer's payment is Paid, it counts towards your earnings.",
                        "Completed jobs that aren't paid yet appear as Pending payout.",
                      ].map((t, i) => (
                        <li key={t} className="flex gap-3">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#0F766E] text-xs font-bold text-white">{i + 1}</span>
                          <span className="leading-6">{t}</span>
                        </li>
                      ))}
                    </ol>
                    <button onClick={() => changeSection("help")} className={`${btnGhost} mt-5 w-full`}>Questions about payments?</button>
                  </section>
                </div>

                <section className="overflow-hidden rounded-[20px] border border-[#E4EAE8] bg-white">
                  <div className="border-b border-[#E4EAE8] p-5 sm:px-6">
                    <h2 className="text-base font-semibold">Recent completed jobs</h2>
                    <p className="mt-1 text-xs text-[#55625F]">Your latest completed jobs and their payment status</p>
                  </div>
                  {providerBookingsLoading ? (
                    <div className="flex items-center justify-center gap-2 p-12 text-sm text-[#55625F]">
                      <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" /> Loading...
                    </div>
                  ) : earnings.recent.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left">
                        <thead className="bg-[#F7FAF9]">
                          <tr>
                            {["Customer", "Service", "Date", "Amount", "Payment", ""].map((h, i) => (
                              <th key={i} scope="col" className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#55625F] sm:px-6">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {earnings.recent.map((b) => (
                            <tr key={b._id} className="border-t border-[#E4EAE8] hover:bg-[#F7FAF9]">
                              <td className="px-5 py-4 text-sm font-semibold sm:px-6">{b.customer?.name || "Customer"}</td>
                              <td className="px-5 py-4 text-sm sm:px-6">{b.serviceName || "Service"}</td>
                              <td className="px-5 py-4 text-sm sm:px-6">{formatDate(b.bookingDate)}</td>
                              <td className="px-5 py-4 text-sm font-semibold sm:px-6">{money(b.amount)}</td>
                              <td className="px-5 py-4 sm:px-6"><StatusPill status={isPaid(b) ? "paid" : b.paymentStatus?.toLowerCase() || "unpaid"} /></td>
                              <td className="px-5 py-4 text-right sm:px-6">
                                <button onClick={() => void viewBookingDetails(b._id)} className={`${btnGhost} !px-3 text-xs`}><Eye size={14} /> View</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState icon={Wallet} title="No completed jobs yet" text="Completed jobs and their payments will show up here." />
                  )}
                </section>
                <p className="text-xs text-[#55625F]">Monthly figures use your {providerBookings.length} most recent loaded bookings. Total earnings comes from your dashboard summary.</p>
              </>
            )}

            {/* ============ HELP & SUPPORT ============ */}
            {activeSection === "help" && (
              <>
                <PageHeading
                  eyebrow="Account / Help & Support"
                  title="Help & Support"
                  description="Find quick answers, or send a message to the CREDENCE support team."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <a href={`mailto:${SUPPORT_EMAIL}`} className={`${card} flex items-center gap-4 transition hover:bg-[#F7FAF9] ${focusRing}`}>
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#E9F1EF] text-[#0F766E]"><Mail size={21} aria-hidden="true" /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Email support</p>
                      <p className="mt-0.5 truncate text-sm text-[#0F766E]">{SUPPORT_EMAIL}</p>
                    </div>
                  </a>
                  {SUPPORT_PHONE ? (
                    <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className={`${card} flex items-center gap-4 transition hover:bg-[#F7FAF9] ${focusRing}`}>
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#E9F1EF] text-[#0F766E]"><Phone size={21} aria-hidden="true" /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Call us</p>
                        <p className="mt-0.5 truncate text-sm text-[#0F766E]">{SUPPORT_PHONE}</p>
                      </div>
                    </a>
                  ) : (
                    <button onClick={() => changeSection("report")} className={`${card} flex items-center gap-4 text-left transition hover:bg-[#F7FAF9] ${focusRing}`}>
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#E9F1EF] text-[#0F766E]"><BarChart3 size={21} aria-hidden="true" /></div>
                      <div>
                        <p className="text-sm font-semibold">Check your report</p>
                        <p className="mt-0.5 text-sm text-[#55625F]">See how your bookings are performing</p>
                      </div>
                    </button>
                  )}
                </div>

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]">
                  <div className="min-w-0 space-y-5">
                    <section className={card}>
                      <h2 className="text-base font-semibold">Frequently asked questions</h2>
                      <div className="mt-3 divide-y divide-[#E4EAE8]">
                        {faqs.map((item, i) => {
                          const open = openFaq === i;
                          return (
                            <div key={item.q}>
                              <h3>
                                <button
                                  onClick={() => setOpenFaq(open ? null : i)}
                                  aria-expanded={open}
                                  aria-controls={`faq-${i}`}
                                  className={`flex min-h-12 w-full items-center justify-between gap-4 rounded-xl py-3 text-left text-sm font-semibold ${focusRing}`}
                                >
                                  {item.q}
                                  <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-[#0F766E] transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
                                </button>
                              </h3>
                              {open && (
                                <p id={`faq-${i}`} className="pb-4 pr-8 text-sm leading-6 text-[#33413E]">{item.a}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <section className={card}>
                      <h2 className="text-base font-semibold">Booking status guide</h2>
                      <p className="mt-1 text-xs text-[#55625F]">What each status means and what to do next</p>
                      <ul className="mt-4 space-y-3">
                        {[
                          { s: "pending", t: "A new request. Accept or reject it." },
                          { s: "confirmed", t: "You accepted. Start the service when you arrive." },
                          { s: "in-progress", t: "Service under way. Mark it completed when done." },
                          { s: "completed", t: "Finished. Counts as earnings once payment is paid." },
                          { s: "rejected", t: "You declined this request. No action needed." },
                          { s: "cancelled", t: "Cancelled before completion. No action needed." },
                        ].map(({ s, t }) => (
                          <li key={s} className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="w-28 shrink-0"><StatusPill status={s} /></span>
                            <span className="min-w-0 flex-1 text-[#33413E]">{t}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>

                  <section className={card}>
                    <h2 className="text-base font-semibold">Contact support</h2>
                    <p className="mt-1 text-xs text-[#55625F]">This opens your email app with your message ready to send.</p>
                    <div className="mt-5 space-y-5">
                      <Field label="Topic" htmlFor="s-topic">
                        <select id="s-topic" className={inputClass} value={supportTopic} onChange={(e) => setSupportTopic(e.target.value)}>
                          {supportTopics.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </Field>
                      <Field label="How can we help?" htmlFor="s-msg">
                        <textarea id="s-msg" rows={6} maxLength={2000} className={`${inputClass} resize-none`} value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="Describe your question or problem. Include a booking ID if it relates to a specific booking." />
                      </Field>
                      <button onClick={sendSupportMessage} disabled={!supportMessage.trim()} className={`${btnPrimary} w-full`}>
                        <Send size={15} aria-hidden="true" /> Send message
                      </button>
                    </div>
                  </section>
                </div>
              </>
            )}

            <footer className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-[#0B4F4A] p-5 text-white">
              <div>
                <p className="text-sm font-semibold">CREDENCE Provider Workspace</p>
                <p className="mt-1 text-xs text-[#CFE7E4]">Manage your services and grow your business.</p>
              </div>
              <p className="text-xs text-[#CFE7E4]">© 2026 CREDENCE</p>
            </footer>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* BOOKING DETAILS DIALOG */}
      <AnimatePresence>
        {selectedBooking && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
            onClick={() => setSelectedBooking(null)}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-label="Booking details"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-[#E4EAE8] p-5 sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0F766E]">Booking details</p>
                  <h3 className="mt-1 text-xl font-bold">{selectedBooking.serviceName || "Service booking"}</h3>
                  <p className="mt-1 break-all text-xs text-[#55625F]">ID: {selectedBooking._id}</p>
                </div>
                <button onClick={() => setSelectedBooking(null)} className={`${btnGhost} !px-3`} aria-label="Close booking details">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusPill status={selectedBooking.status} />
                  <p className="text-2xl font-bold">{money(selectedBooking.amount)}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Customer" value={selectedBooking.customer?.name || "Customer"} />
                  <DetailItem label="Email" value={selectedBooking.customer?.email || "Not provided"} />
                  <DetailItem label="Phone" value={selectedBooking.customer?.phone || selectedBooking.contactPhone || "Not provided"} />
                  <DetailItem label="Booking date" value={formatDate(selectedBooking.bookingDate)} />
                  <DetailItem label="Booking time" value={selectedBooking.bookingTime || "Not specified"} />
                  <DetailItem label="Location" value={selectedBooking.location || "Not provided"} />
                  <DetailItem label="Payment status" value={selectedBooking.paymentStatus || "Not available"} />
                </div>
                {selectedBooking.description && (
                  <div className="rounded-xl bg-[#F2F6F5] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#55625F]">Customer notes</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#33413E]">{selectedBooking.description}</p>
                  </div>
                )}
                <BookingActionButtons booking={selectedBooking} busy={updatingBookingId === selectedBooking._id} onUpdateStatus={updateBookingStatus} />
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="fixed bottom-5 right-5 z-[80] flex items-center gap-3 rounded-2xl border border-[#E4EAE8] bg-white py-2 pl-5 pr-2 text-sm font-semibold shadow-2xl"
          >
            <CheckCircle2 size={19} className="text-[#0F766E]" aria-hidden="true" />
            {toast}
            <button onClick={() => setToast("")} aria-label="Dismiss notification" className={`grid h-11 w-11 place-items-center rounded-xl ${focusRing}`}>
              <X size={16} className="text-slate-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}