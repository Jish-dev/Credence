/*
 * Motion polish:
 * - Page changes: smooth slide-fade + blur transition
 * - Dialogs & toast: spring entrance with backdrop blur
 * - Navigation and stat cards: tactile press / hover spring feedback
 * Tailwind's motion-reduce variants are used for CSS-only movement.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  Filter,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquareWarning,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";

// =====================================================
// CREDENCE ADMIN — Apple-inspired visual system
// =====================================================
// TYPES
// =====================================================

type VerificationStatus = "pending" | "verified" | "rejected";
type ProviderStatus = "draft" | "published";
type ProviderType = "individual" | "business" | "company";

type Page =
  | "dashboard"
  | "providers"
  | "users"
  | "bookings"
  | "complaints";

type Provider = {
  _id: string;
  name: string;
  title?: string;
  category?: string;
  categories?: string[];
  description?: string;
  bio?: string;
  city?: string;
  area?: string;
  address?: string;
  location?: string;
  experienceYears?: number;
  experience?: number;
  startingPrice?: number;
  contactPhone?: string;
  phone?: string;
  email?: string;
  isAvailable?: boolean;
  verificationStatus?: VerificationStatus;
  status?: ProviderStatus;
  providerType?: ProviderType;
  contact?: string;
  profileImage?: string;
  averageRating?: number;
  reviewCount?: number;
  createdAt?: string;
};

type BookingStatus =
  | "pending"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "rejected";

type Booking = {
  _id: string;
  customer?: { _id?: string; name?: string; email?: string; phone?: string } | null;
  provider?: { _id?: string; name?: string; title?: string; category?: string; location?: string } | null;
  serviceName?: string;
  service?: string;
  description?: string;
  bookingDate?: string;
  date?: string;
  bookingTime?: string;
  time?: string;
  location?: string;
  contactPhone?: string;
  amount?: number;
  status: BookingStatus;
  paymentStatus?: string;
  createdAt?: string;
  adminNote?: string;
};

type ProviderForm = {
  name: string;
  title: string;
  category: string;
  description: string;
  location: string;
  city: string;
  area: string;
  address: string;
  experienceYears: string;
  startingPrice: string;
  contactPhone: string;
  email: string;
  profileImage: string;
  providerType: ProviderType;
  status: ProviderStatus;
  isAvailable: boolean;
};

type Customer = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  createdAt?: string;
  isActive?: boolean;
};

type CustomerForm = {
  name: string;
  email: string;
  phone: string;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin";
};

type DashboardStats = {
  totalCustomers: number;
  totalProviders: number;
  publishedProviders: number;
  totalBookings: number;
  totalReviews: number;
  completedBookings: number;
  pendingBookings: number;
  totalRevenue: number;
};

// =====================================================
// API CONFIGURATION
// =====================================================

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/v1"
).replace(/\/+$/, "");

const http = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("credence_token") ||
    sessionStorage.getItem("credence_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function clearAdminSession() {
  localStorage.removeItem("credence_token");
  localStorage.removeItem("credence_admin");
  sessionStorage.removeItem("credence_token");
  sessionStorage.removeItem("credence_admin");
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      (error.code === "ERR_NETWORK"
        ? `Cannot connect to ${API_URL}. Check your backend.`
        : error.message)
    );
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

function unwrapProviders(payload: any): Provider[] {
  const candidates = [
    payload?.providers,
    payload?.data?.providers,
    payload?.data,
    payload?.result?.providers,
    payload?.result,
    payload,
  ];

  return candidates.find(Array.isArray) || [];
}

function unwrapProvider(payload: any): Provider | null {
  return (
    payload?.provider ||
    payload?.data?.provider ||
    payload?.data ||
    null
  );
}

// =====================================================
// CONSTANTS
// =====================================================

const emptyForm: ProviderForm = {
  name: "",
  title: "",
  category: "",
  description: "",
  location: "",
  city: "",
  area: "",
  address: "",
  experienceYears: "0",
  startingPrice: "0",
  contactPhone: "",
  email: "",
  profileImage: "",
  providerType: "individual",
  status: "draft",
  isAvailable: true,
};

const categories = [
  "Electrical",
  "Plumbing",
  "Cleaning",
  "Painting",
  "Carpentry",
  "AC & Appliance Repair",
  "Beauty & Wellness",
  "Moving & Shifting",
  "Pest Control",
  "Vehicle Repair",
  "Other",
];

const navItems: {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "providers", label: "Providers", icon: BriefcaseBusiness },
  { id: "users", label: "Customers", icon: Users },
  { id: "bookings", label: "Bookings", icon: CalendarCheck },
  { id: "complaints", label: "Complaints", icon: MessageSquareWarning },
];

// =====================================================
// HELPERS
// =====================================================

function money(value?: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function statusLabel(status?: VerificationStatus) {
  if (status === "verified") return "Verified";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function Badge({ status }: { status?: VerificationStatus }) {
  const styles =
    status === "verified"
      ? "bg-emerald-50/80 text-emerald-700 ring-emerald-500/20"
      : status === "rejected"
        ? "bg-rose-50/80 text-rose-700 ring-rose-500/20"
        : "bg-amber-50/80 text-amber-700 ring-amber-500/20";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {status === "verified" ? (
        <CheckCircle2 size={13} />
      ) : status === "rejected" ? (
        <XCircle size={13} />
      ) : (
        <Clock3 size={13} />
      )}
      {statusLabel(status)}
    </span>
  );
}

function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <label
      className={`flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-600 ${
        full ? "sm:col-span-2" : ""
      }`}
    >
      {label}
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-[1.35rem] border border-black/[0.08] bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

// =====================================================
// REUSABLE MOTION COMPONENTS
// =====================================================

function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-md sm:items-center sm:p-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`my-auto w-full ${
            wide ? "max-w-3xl" : "max-w-xl"
          } overflow-hidden rounded-[1.8rem] border border-white/60 bg-white/95 shadow-[0_32px_100px_-20px_rgba(0,0,0,0.3)] backdrop-blur-xl`}
        >
          <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-600">
                CREDENCE Administration
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                {title}
              </h2>
            </div>

            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={19} />
            </motion.button>
          </div>

          <div className="max-h-[calc(100dvh-120px)] overflow-y-auto p-6 sm:p-7">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  note,
  loading,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  note: string;
  loading?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="group relative overflow-hidden rounded-[1.6rem] border border-black/[0.06] bg-white/90 p-5 shadow-[0_4px_24px_rgba(15,23,42,0.04)] backdrop-blur-md transition-shadow hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {loading ? (
              <span className="inline-block animate-pulse">...</span>
            ) : (
              value
            )}
          </p>
        </div>

        <motion.div 
          whileHover={{ rotate: 12, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="rounded-[1.25rem] bg-emerald-50 p-3 text-emerald-700 ring-1 ring-emerald-500/10 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300"
        >
          <Icon size={22} />
        </motion.div>
      </div>

      <p className="mt-3 text-xs text-slate-400">{note}</p>
    </motion.div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-[1.35rem] bg-slate-50/80 p-3.5 border border-slate-100">
      <Icon size={16} className="mt-0.5 shrink-0 text-emerald-600" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-semibold text-slate-700">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

// =====================================================
// MAIN ADMIN COMPONENT
// =====================================================

export default function Admin() {
  // ---------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [adminName, setAdminName] = useState("Administrator");

  // ---------------------------------------------------
  // DASHBOARD STATE
  // ---------------------------------------------------

  const [page, setPage] = useState<Page>("dashboard");
  const [mobileNav, setMobileNav] = useState(false);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPages, setCustomerPages] = useState(1);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerForm>({ name: "", email: "", phone: "" });
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerActionId, setCustomerActionId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("");
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingPages, setBookingPages] = useState(1);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingUpdating, setBookingUpdating] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalProviders: 0,
    publishedProviders: 0,
    totalBookings: 0,
    totalReviews: 0,
    completedBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [toast, setToast] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ---------------------------------------------------
  // FILTERS AND MODALS
  // ---------------------------------------------------

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [viewProvider, setViewProvider] = useState<Provider | null>(null);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(
    null
  );

  const [form, setForm] = useState<ProviderForm>(emptyForm);
  const [imageUploading, setImageUploading] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState("");

  // ---------------------------------------------------
  // TOAST
  // ---------------------------------------------------

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }, []);

  // ---------------------------------------------------
  // VERIFY ADMIN SESSION
  // ---------------------------------------------------

  useEffect(() => {
    let active = true;

    async function verifySession() {
      const token =
        localStorage.getItem("credence_token") ||
        sessionStorage.getItem("credence_token");

      if (!token) {
        if (active) setCheckingAuth(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const user = response.data?.user;

        if (!user || user.role !== "admin") {
          throw new Error("Admin access only.");
        }

        const adminUser: AdminUser = {
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: "admin",
        };

        const storage = localStorage.getItem("credence_token")
          ? localStorage
          : sessionStorage;

        storage.setItem("credence_admin", JSON.stringify(adminUser));

        if (active) {
          setAdminName(adminUser.name || "Administrator");
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Session verification failed:", error);
        clearAdminSession();
      } finally {
        if (active) setCheckingAuth(false);
      }
    }

    void verifySession();

    return () => {
      active = false;
    };
  }, []);

  // ---------------------------------------------------
  // ADMIN LOGIN
  // ---------------------------------------------------

  async function handleAdminLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setLoginError("");

    if (!email.trim() || !password) {
      setLoginError("Please enter your email and password.");
      return;
    }

    try {
      setLoginLoading(true);

      const response = await axios.post(`${API_URL}/auth/login`, {
        email: email.trim().toLowerCase(),
        password,
      });

      const { token, user } = response.data;

      if (!token || user?.role !== "admin") {
        setLoginError("Access denied. Admin account required.");
        return;
      }

      clearAdminSession();

      const storage = rememberMe ? localStorage : sessionStorage;

      storage.setItem("credence_token", token);
      storage.setItem("credence_admin", JSON.stringify(user));

      setAdminName(user.name || "Administrator");
      setPassword("");
      setIsAuthenticated(true);

      notify("Welcome to CREDENCE Admin!");
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  }

  // ---------------------------------------------------
  // ADMIN LOGOUT
  // ---------------------------------------------------

  function handleLogout() {
    if (!window.confirm("Are you sure you want to logout?")) return;

    clearAdminSession();

    setIsAuthenticated(false);
    setPage("dashboard");
    setProviders([]);
    setPassword("");
    setEmail("");
    setLoginError("");

    setStats({
      totalCustomers: 0,
      totalProviders: 0,
      publishedProviders: 0,
      totalBookings: 0,
      totalReviews: 0,
      completedBookings: 0,
      pendingBookings: 0,
      totalRevenue: 0,
    });

    notify("Logged out successfully.");
  }

  // ---------------------------------------------------
  // FETCH PROVIDERS
  // ---------------------------------------------------

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await http.get("/providers/admin/all");
      setProviders(unwrapProviders(response.data));
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------
  // FETCH DASHBOARD STATISTICS
  // ---------------------------------------------------

  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError("");

    try {
      const response = await http.get("/admin/dashboard/stats");
      const data = response.data?.data || {};

      setStats({
        totalCustomers: Number(data.totalCustomers || 0),
        totalProviders: Number(data.totalProviders || 0),
        publishedProviders: Number(data.publishedProviders || 0),
        totalBookings: Number(data.totalBookings || 0),
        totalReviews: Number(data.totalReviews || 0),
        completedBookings: Number(data.completedBookings || 0),
        pendingBookings: Number(data.pendingBookings || 0),
        totalRevenue: Number(data.totalRevenue || 0),
      });

      setLastUpdated(new Date());
    } catch (error) {
      setDashboardError(getErrorMessage(error));
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // ---------------------------------------------------
  // FETCH ALL REGISTERED CUSTOMERS
  // ---------------------------------------------------

  const fetchCustomers = useCallback(async () => {
    setCustomerLoading(true);
    setCustomerError("");

    try {
      const response = await http.get("/customers", {
        params: {
          page: customerPage,
          limit: 10,
          ...(customerSearch.trim() ? { search: customerSearch.trim() } : {}),
        },
      });

      const data = response.data || {};
      setCustomers(Array.isArray(data.customers) ? data.customers : []);
      setCustomerTotal(Number(data.pagination?.total || 0));
      setCustomerPages(Math.max(1, Number(data.pagination?.pages || 1)));
    } catch (err) {
      setCustomerError(getErrorMessage(err));
      setCustomers([]);
      setCustomerTotal(0);
      setCustomerPages(1);
    } finally {
      setCustomerLoading(false);
    }
  }, [customerPage, customerSearch]);

  useEffect(() => {
    if (isAuthenticated && page === "users") {
      void fetchCustomers();
    }
  }, [isAuthenticated, page, fetchCustomers]);

  // ---------------------------------------------------
  // CUSTOMER MANAGEMENT ACTIONS
  // ---------------------------------------------------

  function openCustomerEdit(customer: Customer) {
    setSelectedCustomer(null);
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
    });
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCustomer || customerSaving) return;

    const name = customerForm.name.trim();
    const email = customerForm.email.trim().toLowerCase();
    const phone = customerForm.phone.trim();

    if (name.length < 2 || !email) {
      notify("Enter a valid customer name and email address.");
      return;
    }

    try {
      setCustomerSaving(true);
      const response = await http.put(`/customers/${encodeURIComponent(editingCustomer._id)}`, {
        name,
        email,
        phone,
      });
      const updated: Customer = response.data?.customer || { ...editingCustomer, name, email, phone };
      setCustomers((current) => current.map((item) => item._id === updated._id ? { ...item, ...updated } : item));
      setSelectedCustomer((current) => current?._id === updated._id ? { ...current, ...updated } : current);
      setEditingCustomer(null);
      notify("Customer details updated successfully.");
      await fetchCustomers();
    } catch (err) {
      notify(getErrorMessage(err));
    } finally {
      setCustomerSaving(false);
    }
  }

  async function toggleCustomerStatus(customer: Customer) {
    const nextStatus = customer.isActive === false;
    const action = nextStatus ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${action} ${customer.name || "this customer"}?`)) return;

    try {
      setCustomerActionId(customer._id);
      const response = await http.patch(`/customers/${encodeURIComponent(customer._id)}/status`, { isActive: nextStatus });
      const updated: Customer = response.data?.customer || { ...customer, isActive: nextStatus };
      setCustomers((current) => current.map((item) => item._id === customer._id ? { ...item, ...updated } : item));
      setSelectedCustomer((current) => current?._id === customer._id ? { ...current, ...updated } : current);
      notify(nextStatus ? "Customer account activated." : "Customer account deactivated.");
    } catch (err) {
      notify(getErrorMessage(err));
    } finally {
      setCustomerActionId(null);
    }
  }

  async function deleteCustomer(customer: Customer) {
    if (!window.confirm(`Permanently delete ${customer.name || "this customer"}? This action cannot be undone.`)) return;

    try {
      setCustomerActionId(customer._id);
      await http.delete(`/customers/${encodeURIComponent(customer._id)}`);
      setCustomers((current) => current.filter((item) => item._id !== customer._id));
      setCustomerTotal((current) => Math.max(0, current - 1));
      setSelectedCustomer(null);
      notify("Customer deleted successfully.");
      await fetchCustomers();
      await fetchDashboard();
    } catch (err) {
      notify(getErrorMessage(err));
    } finally {
      setCustomerActionId(null);
    }
  }

  // ---------------------------------------------------
  // FETCH ADMIN BOOKINGS
  // ---------------------------------------------------

  const fetchBookings = useCallback(async () => {
    setBookingLoading(true);
    setBookingError("");

    try {
      const params: Record<string, string | number> = {
        page: bookingPage,
        limit: 20,
      };
      if (bookingStatusFilter) params.status = bookingStatusFilter;
      if (bookingSearch.trim()) params.search = bookingSearch.trim();

      const response = await http.get("/bookings/admin/all", { params });
      const data = response.data;
      setBookings(Array.isArray(data?.bookings) ? data.bookings : []);
      setBookingTotal(Number(data?.pagination?.total || 0));
      setBookingPages(Math.max(1, Number(data?.pagination?.pages || 1)));
    } catch (err) {
      setBookingError(getErrorMessage(err));
      setBookings([]);
    } finally {
      setBookingLoading(false);
    }
  }, [bookingPage, bookingStatusFilter, bookingSearch]);

  useEffect(() => {
    if (isAuthenticated && page === "bookings") {
      void fetchBookings();
    }
  }, [isAuthenticated, page, fetchBookings]);

  async function updateBookingStatus(booking: Booking, status: BookingStatus) {
    if (bookingUpdating) return;
    const accepted = window.confirm(
      `Change this booking to ${status.replace("-", " ")}?`
    );
    if (!accepted) return;

    try {
      setBookingUpdating(booking._id);
      const response = await http.patch(
        `/bookings/admin/${encodeURIComponent(booking._id)}/status`,
        { status }
      );
      const updatedBooking = response.data?.booking;
      if (updatedBooking) {
        setSelectedBooking(updatedBooking);
      } else {
        setSelectedBooking((current) =>
          current?._id === booking._id ? { ...current, status } : current
        );
      }
      notify("Booking status updated successfully.");
      await fetchBookings();
      await fetchDashboard();
    } catch (err) {
      notify(getErrorMessage(err));
    } finally {
      setBookingUpdating(null);
    }
  }

  // ---------------------------------------------------
  // LOAD DATA AFTER LOGIN
  // ---------------------------------------------------

  useEffect(() => {
    if (!isAuthenticated) return;

    void fetchProviders();
    void fetchDashboard();
  }, [isAuthenticated, fetchProviders, fetchDashboard]);

  // ---------------------------------------------------
  // PROVIDER ANALYTICS
  // ---------------------------------------------------

  const providerAnalytics = useMemo(() => {
    const verified = providers.filter(
      (provider) => provider.verificationStatus === "verified"
    ).length;

    const rejected = providers.filter(
      (provider) => provider.verificationStatus === "rejected"
    ).length;

    const pending = providers.filter(
      (provider) =>
        !provider.verificationStatus ||
        provider.verificationStatus === "pending"
    ).length;

    const available = providers.filter(
      (provider) => provider.isAvailable !== false
    ).length;

    const categoryCounts: Record<string, number> = {};

    providers.forEach((provider) => {
      const category =
        provider.category ||
        provider.categories?.[0] ||
        "Other";

      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const categoryData = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      verified,
      rejected,
      pending,
      available,
      categoryData,
    };
  }, [providers]);

  // ---------------------------------------------------
  // PROVIDER FILTERS
  // ---------------------------------------------------

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const searchable = [
        provider.name,
        provider.title,
        provider.category,
        ...(provider.categories || []),
        provider.city,
        provider.location,
        provider.area,
        provider.email,
        provider.contactPhone,
        provider.phone,
      ]
        .join(" ")
        .toLowerCase();

      return (
        searchable.includes(search.toLowerCase()) &&
        (!statusFilter ||
          (provider.verificationStatus || "pending") === statusFilter) &&
        (!categoryFilter ||
          provider.category === categoryFilter ||
          provider.categories?.includes(categoryFilter))
      );
    });
  }, [providers, search, statusFilter, categoryFilter]);

  const categoriesInUse = useMemo(
    () =>
      [
        ...new Set(
          providers
            .flatMap((provider) => [
              provider.category,
              ...(provider.categories || []),
            ])
            .filter(Boolean)
        ),
      ] as string[],
    [providers]
  );

  // ---------------------------------------------------
  // PROVIDER FORM
  // ---------------------------------------------------

  function openAdd() {
    setEditingProvider(null);
    setForm(emptyForm);
    setSelectedImageName("");
    setModalOpen(true);
  }

  function openEdit(provider: Provider) {
    setEditingProvider(provider);
    setSelectedImageName("");

    setForm({
      name: provider.name || "",
      title: provider.title || "",
      category: provider.category || provider.categories?.[0] || "",
      description: provider.description || provider.bio || "",
      location: provider.location || [provider.area, provider.city].filter(Boolean).join(", "),
      city: provider.city || "",
      area: provider.area || "",
      address: provider.address || "",
      experienceYears: String(
        provider.experienceYears ?? provider.experience ?? 0
      ),
      startingPrice: String(provider.startingPrice ?? 0),
      contactPhone: provider.contact || provider.contactPhone || provider.phone || "",
      email: provider.email || "",
      profileImage: provider.profileImage || "",
      providerType: provider.providerType || "individual",
      status: provider.status || "draft",
      isAvailable: provider.isAvailable !== false,
    });

    setModalOpen(true);
  }

  // ---------------------------------------------------
  // UPLOAD PROVIDER PROFILE IMAGE TO CLOUDINARY
  // ---------------------------------------------------

  async function handleProfileImageUpload(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify("Image must be smaller than 5 MB.");
      return;
    }

    const data = new FormData();
    data.append("image", file);

    setImageUploading(true);
    setSelectedImageName(file.name);

    try {
      const response = await http.post("/admin/upload", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const imageUrl = response.data?.imageUrl;

      if (!imageUrl) {
        throw new Error("Upload succeeded but no image URL was returned.");
      }

      setForm((current) => ({ ...current, profileImage: imageUrl }));
      notify("Provider image uploaded successfully.");
    } catch (error) {
      setSelectedImageName("");
      notify(getErrorMessage(error));
    } finally {
      setImageUploading(false);
    }
  }

  // ---------------------------------------------------
  // CREATE / UPDATE PROVIDER
  // ---------------------------------------------------

  async function saveProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (imageUploading) {
      notify("Please wait for the image upload to finish.");
      return;
    }

    const contact = form.contactPhone.trim();
    const location = form.location.trim();

    if (!form.name.trim() || !form.category.trim() || !location || !contact) {
      notify("Provider name, category, location and contact number are required.");
      return;
    }

    const body = {
      name: form.name.trim(),
      title: form.title.trim(),
      category: form.category.trim(),
      categories: [form.category.trim()],
      providerType: form.providerType,
      location,
      city: form.city.trim(),
      area: form.area.trim(),
      address: form.address.trim(),
      experienceYears: Number(form.experienceYears) || 0,
      bio: form.description.trim(),
      description: form.description.trim(),
      contact,
      contactPhone: contact,
      email: form.email.trim(),
      startingPrice: Number(form.startingPrice) || 0,
      profileImage: form.profileImage.trim(),
      status: form.status,
      isAvailable: form.isAvailable,
    };

    setSaving(true);

    try {
      if (editingProvider) {
        await http.put(
          `/providers/${encodeURIComponent(editingProvider._id)}`,
          body
        );
        notify("Provider updated successfully.");
      } else {
        await http.post("/providers", body);
        notify("Provider added successfully.");
      }

      setModalOpen(false);
      setEditingProvider(null);
      setForm(emptyForm);

      await fetchProviders();
      await fetchDashboard();
    } catch (error) {
      notify(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------
  // PUBLISH / UNPUBLISH PROVIDER
  // ---------------------------------------------------

  async function updateProviderStatus(provider: Provider, status: ProviderStatus) {
    try {
      const response = await http.patch(
        `/providers/${encodeURIComponent(provider._id)}/status`,
        { status }
      );
      const updated = unwrapProvider(response.data) || { ...provider, status };
      setProviders((current) =>
        current.map((item) => item._id === provider._id ? { ...item, ...updated, status } : item)
      );
      setViewProvider((current) =>
        current?._id === provider._id ? { ...current, ...updated, status } : current
      );
      notify(status === "published" ? "Provider published successfully." : "Provider saved as draft.");
      await fetchDashboard();
    } catch (error) {
      notify(getErrorMessage(error));
    }
  }

  // ---------------------------------------------------
  // UPDATE VERIFICATION
  // ---------------------------------------------------

  async function updateVerification(
    provider: Provider,
    status: VerificationStatus
  ) {
    try {
      await http.patch(
        `/providers/${encodeURIComponent(provider._id)}/verification`,
        {
          verificationStatus: status,
        }
      );

      setProviders((current) =>
        current.map((item) =>
          item._id === provider._id
            ? { ...item, verificationStatus: status }
            : item
        )
      );

      setViewProvider((current) =>
        current?._id === provider._id
          ? { ...current, verificationStatus: status }
          : current
      );

      notify(`Provider marked ${status}.`);

      await fetchDashboard();
    } catch (error) {
      notify(getErrorMessage(error));
    }
  }

  // ---------------------------------------------------
  // DELETE PROVIDER
  // ---------------------------------------------------

  async function deleteProvider(provider: Provider) {
    if (
      !window.confirm(
        `Permanently delete ${provider.name} from CREDENCE?`
      )
    ) {
      return;
    }

    try {
      await http.delete(
        `/providers/${encodeURIComponent(provider._id)}`
      );

      setProviders((current) =>
        current.filter((item) => item._id !== provider._id)
      );

      setViewProvider(null);

      notify("Provider deleted successfully.");

      await fetchDashboard();
    } catch (error) {
      notify(getErrorMessage(error));
    }
  }

  const pageTitle =
    navItems.find((item) => item.id === page)?.label || "Dashboard";

  // =====================================================
  // AUTH LOADING SCREEN
  // =====================================================

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111b18] text-white">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="mx-auto mb-4 inline-block text-emerald-400"
          >
            <RefreshCw size={32} />
          </motion.div>
          <p className="text-sm font-medium tracking-wide text-emerald-100/80">
            Checking administrator access...
          </p>
        </motion.div>
      </div>
    );
  }

  // =====================================================
  // LOGIN SCREEN
  // =====================================================

  if (!isAuthenticated) {
    return (
      <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#111b18] font-sans text-white">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(16,185,129,0.25),transparent_65%)]" 
        />

        <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12 lg:px-20">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <img
              src="/C-Logo.png"
              alt="CREDENCE"
              className="h-11 w-11 object-contain"
            />
            <span className="text-2xl font-bold tracking-wide">
              CREDENCE
            </span>
          </motion.div>

          <motion.span 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs font-semibold tracking-widest text-emerald-300/80"
          >
            ADMIN PORTAL
          </motion.span>
        </header>

        <section className="relative z-10 flex flex-1 items-center justify-center px-5 pb-32 pt-8">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 25 }}
            className="w-full max-w-md"
          >
            <div className="mb-10 text-center">
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                src="/C-Logo.png"
                alt="CREDENCE Logo"
                className="mx-auto mb-5 h-24 w-24 object-contain"
              />

              <h1 className="text-4xl font-light tracking-wide md:text-5xl">
                Sign In
              </h1>

              <p className="mt-4 text-sm text-emerald-100/70">
                Sign in and start managing your platform.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div className="relative">
                <Mail
                  size={20}
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-100/70"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  autoComplete="username"
                  required
                  className="h-14 w-full rounded-[1.35rem] border border-white/15 bg-white/10 pl-16 pr-5 text-sm text-white outline-none backdrop-blur-md transition duration-200 placeholder:text-emerald-100/60 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20"
                />
              </div>

              <div className="relative">
                <LockKeyhole
                  size={20}
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-100/70"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                  className="h-14 w-full rounded-[1.35rem] border border-white/15 bg-white/10 pl-16 pr-14 text-sm text-white outline-none backdrop-blur-md transition duration-200 placeholder:text-emerald-100/60 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-100/70 transition-colors hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-3 text-sm text-emerald-50">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(event.target.checked)
                    }
                    className="h-4 w-4 accent-emerald-500 rounded"
                  />
                  Remember me
                </label>

                <span className="text-xs font-semibold text-emerald-300/80">
                  Secure Admin Access
                </span>
              </div>

              {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[1.35rem] border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur-sm"
                >
                  {loginError}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                type="submit"
                disabled={loginLoading}
                className="h-14 w-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all duration-200 motion-reduce:transition-none hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loginLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="animate-spin" size={18} /> Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </motion.button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-emerald-100/60">
              <ShieldCheck size={16} />
              Protected Administrator Login
            </div>
          </motion.div>
        </section>

        <div className="pointer-events-none absolute bottom-0 left-0 h-44 w-full overflow-hidden">
          <svg
            viewBox="0 0 1440 300"
            preserveAspectRatio="none"
            className="absolute bottom-0 h-full w-full"
          >
            <path
              d="M0 100 C250 210 450 130 700 110 C1000 60 1200 80 1440 140 L1440 300 L0 300Z"
              fill="#0b5a45"
            />
            <path
              d="M0 155 C260 245 520 180 760 145 C1050 95 1220 120 1440 170 L1440 300 L0 300Z"
              fill="#1b8060"
            />
            <path
              d="M0 190 C260 270 520 205 780 185 C1050 150 1230 145 1440 190 L1440 300 L0 300Z"
              fill="#d8eee2"
            />
            <path
              d="M0 215 C300 270 520 250 760 215 C1030 175 1250 175 1440 210 L1440 300 L0 300Z"
              fill="#f5f5f7"
            />
          </svg>
        </div>

        <footer className="relative z-10 bg-[#f5f5f7] px-4 pb-5 pt-3 text-center text-xs text-slate-500">
          <p>© 2026 CREDENCE. All rights reserved.</p>
          <p className="mt-1">Administration Portal</p>
        </footer>
      </main>
    );
  }

  // =====================================================
  // MAIN DASHBOARD
  // =====================================================

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-0 text-slate-800 md:grid md:grid-cols-[260px_minmax(0,1fr)] md:gap-3 md:p-3">

      {/* SIDEBAR */}

      <motion.aside
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`${
          mobileNav
            ? "fixed inset-0 z-40 flex"
            : "hidden"
        } md:sticky md:top-3 md:flex md:h-[calc(100dvh-24px)] flex-col rounded-none border border-white/10 bg-[#111b18]/95 px-4 py-6 text-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] backdrop-blur-2xl md:rounded-[1.8rem]`}
      >
        <div className="flex items-center gap-3 px-2">
          <img
            src="/C-Logo.png"
            alt="CREDENCE"
            className="h-11 w-11 rounded-[1.35rem] object-contain"
          />

          <div>
            <h1 className="text-lg font-bold tracking-tight">
              CREDENCE
            </h1>
            <p className="text-[10px] font-semibold tracking-[.22em] text-emerald-400">
              ADMIN PORTAL
            </p>
          </div>

          <button
            onClick={() => setMobileNav(false)}
            className="ml-auto rounded-lg p-2 text-emerald-100 md:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <div className="mt-9">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-200/50">
            Navigation
          </p>

          <nav className="space-y-1.5">
            {navItems.map(({ id, label, icon: Icon }) => (
              <motion.button
                key={id}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                onClick={() => {
                  setPage(id);
                  setMobileNav(false);
                }}
                className={`flex w-full items-center gap-3 rounded-[1.35rem] px-3.5 py-3 text-left text-sm font-medium transition-all duration-200 ${
                  page === id
                    ? "bg-emerald-500/20 text-white shadow-inner ring-1 ring-emerald-400/30 font-semibold"
                    : "text-emerald-100/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} className={page === id ? "text-emerald-400" : ""} />
                <span className="flex-1">{label}</span>

                {id === "providers" && (
                  <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    {providers.length}
                  </span>
                )}
              </motion.button>
            ))}
          </nav>
        </div>

        <div className="mt-auto">
          <div className="mb-5 rounded-[1.35rem] border border-white/10 bg-white/5 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <ShieldCheck size={15} />
              Protected workspace
            </div>
            <p className="mt-2 text-xs leading-5 text-emerald-100/60">
              Manage service providers, customers and platform operations.
            </p>
          </div>

          <div className="flex items-center gap-3 border-t border-white/10 px-2 pt-4">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-400 font-bold text-emerald-950 shadow-md shadow-emerald-400/20">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{adminName}</p>
              <p className="text-[10px] font-medium text-emerald-300/60">
                Administrator
              </p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* MAIN CONTENT */}

      <main className="min-w-0 overflow-hidden rounded-none bg-[#f5f5f7] md:rounded-[1.8rem]">

        {/* HEADER */}

        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-black/[0.05] bg-white/75 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="rounded-lg border border-black/[0.08] p-2 md:hidden"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={18} />
            </button>

            <div>
              <p className="text-[11px] font-medium text-slate-400">
                CREDENCE /{" "}
                <span className="font-semibold text-slate-700">
                  {pageTitle}
                </span>
              </p>
              <h2 className="hidden text-sm font-bold text-slate-900 sm:block">
                {pageTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-800">
                {adminName}
              </p>
              <p className="text-[10px] text-slate-400">
                Administrator
              </p>
            </div>

            <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 ring-2 ring-emerald-500/20">
              {adminName.charAt(0).toUpperCase()}
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleLogout}
              title="Logout"
              className="inline-flex items-center gap-2 rounded-[1.35rem] border border-black/[0.08] bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </motion.button>
          </div>
        </header>

        {/* CONTENT */}

        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-7"
          >

            {/* GENERAL ERROR */}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center gap-3 rounded-[1.35rem] border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 backdrop-blur-md"
              >
                <AlertCircle size={17} />
                <span className="min-w-0 flex-1">{error}</span>
                <button
                  onClick={() => void fetchProviders()}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm transition hover:bg-rose-50"
                >
                  <RefreshCw size={14} />
                  Retry
                </button>
              </motion.div>
            )}

            {/* =========================================
                DASHBOARD
            ========================================= */}

            {page === "dashboard" && (
              <div className="space-y-6">

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                      CREDENCE / OVERVIEW
                    </p>
                    <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">
                      Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Monitor and manage your service marketplace.
                    </p>

                    {lastUpdated && (
                      <p className="mt-2 text-xs text-slate-400">
                        Last synced: {lastUpdated.toLocaleTimeString()}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        void fetchDashboard();
                        void fetchProviders();
                      }}
                      disabled={dashboardLoading}
                      className="inline-flex items-center gap-2 rounded-[1.35rem] border border-black/[0.08] bg-white px-4 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50/80 disabled:opacity-50"
                    >
                      <RefreshCw
                        size={16}
                        className={dashboardLoading ? "animate-spin text-emerald-600" : "text-emerald-600"}
                      />
                      Refresh
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={openAdd}
                      className="inline-flex items-center gap-2 rounded-[1.35rem] bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/10 transition hover:bg-emerald-800"
                    >
                      <Plus size={17} />
                      Add provider
                    </motion.button>
                  </div>
                </div>

                {dashboardError && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <span>{dashboardError}</span>
                    <button
                      onClick={() => void fetchDashboard()}
                      className="font-bold underline"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* MAIN STATISTICS */}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Total Customers"
                    value={stats.totalCustomers.toLocaleString("en-IN")}
                    icon={Users}
                    note="Registered customer accounts"
                    loading={dashboardLoading}
                  />

                  <StatCard
                    label="Service Providers"
                    value={stats.totalProviders.toLocaleString("en-IN")}
                    icon={BriefcaseBusiness}
                    note="All provider listings"
                    loading={dashboardLoading}
                  />

                  <StatCard
                    label="Total Bookings"
                    value={stats.totalBookings.toLocaleString("en-IN")}
                    icon={CalendarCheck}
                    note="Marketplace booking records"
                    loading={dashboardLoading}
                  />

                  <StatCard
                    label="Total Revenue"
                    value={money(stats.totalRevenue)}
                    icon={CreditCard}
                    note="Revenue from completed bookings"
                    loading={dashboardLoading}
                  />
                </div>

                {/* SECONDARY STATISTICS */}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Published Providers"
                    value={stats.publishedProviders}
                    icon={CheckCircle2}
                    note="Public provider listings"
                    loading={dashboardLoading}
                  />

                  <StatCard
                    label="Pending Bookings"
                    value={stats.pendingBookings}
                    icon={Clock3}
                    note="Awaiting booking action"
                    loading={dashboardLoading}
                  />

                  <StatCard
                    label="Completed Bookings"
                    value={stats.completedBookings}
                    icon={Activity}
                    note="Successfully completed services"
                    loading={dashboardLoading}
                  />

                  <StatCard
                    label="Customer Reviews"
                    value={stats.totalReviews}
                    icon={Star}
                    note="Reviews submitted on Credence"
                    loading={dashboardLoading}
                  />
                </div>

                {/* PROVIDER ANALYTICS */}

                <div className="grid gap-5 xl:grid-cols-2">

                  {/* VERIFICATION */}

                  <section className="rounded-[1.6rem] border border-black/[0.06] bg-white/90 p-6 shadow-[0_4px_24px_rgba(15,23,42,0.03)] backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Provider verification
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Verification status from provider records
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                        <ShieldCheck size={22} />
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-6">
                      <div
                        className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full transition-transform duration-500 hover:scale-105"
                        style={{
                          background: `conic-gradient(#059669 ${
                            providers.length
                              ? (providerAnalytics.verified / providers.length) * 100
                              : 0
                          }%, #e2e8f0 0)`,
                        }}
                      >
                        <div className="grid h-28 w-28 place-items-center rounded-full bg-white shadow-inner">
                          <div className="text-center">
                            <p className="text-3xl font-bold text-slate-900">
                              {providers.length
                                ? Math.round(
                                    (providerAnalytics.verified /
                                      providers.length) *
                                      100
                                  )
                                : 0}
                              %
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400">
                              Verified
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-[150px] flex-1 space-y-4">
                        {[
                          {
                            label: "Verified",
                            value: providerAnalytics.verified,
                            color: "bg-emerald-500",
                          },
                          {
                            label: "Pending",
                            value: providerAnalytics.pending,
                            color: "bg-amber-400",
                          },
                          {
                            label: "Rejected",
                            value: providerAnalytics.rejected,
                            color: "bg-rose-500",
                          },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="mb-1.5 flex justify-between text-xs">
                              <span className="text-slate-500 font-medium">
                                {item.label}
                              </span>
                              <strong className="text-slate-800">
                                {item.value}
                              </strong>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${
                                    providers.length
                                      ? (item.value / providers.length) * 100
                                      : 0
                                  }%`,
                                }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={`${item.color} h-full rounded-full`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setPage("providers")}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-[1.35rem] bg-emerald-50/80 border border-emerald-500/10 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      Manage verification
                      <ArrowUpRight size={16} />
                    </motion.button>
                  </section>

                  {/* CATEGORIES */}

                  <section className="rounded-[1.6rem] border border-black/[0.06] bg-white/90 p-6 shadow-[0_4px_24px_rgba(15,23,42,0.03)] backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Service categories
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Provider distribution by category
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                        <Activity size={22} />
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      {providerAnalytics.categoryData.length ? (
                        providerAnalytics.categoryData.map((item) => (
                          <div key={item.name}>
                            <div className="mb-1.5 flex justify-between text-xs">
                              <span className="font-medium text-slate-700">
                                {item.name}
                              </span>
                              <span className="font-bold text-slate-900">
                                {item.count}
                              </span>
                            </div>

                            <div className="h-2.5 overflow-hidden rounded-full bg-emerald-50">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${
                                    providers.length
                                      ? (item.count / providers.length) * 100
                                      : 0
                                  }%`,
                                }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="h-full rounded-full bg-emerald-600"
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="py-10 text-center text-sm text-slate-400">
                          No provider category data available.
                        </p>
                      )}
                    </div>
                  </section>
                </div>

                {/* LOWER DASHBOARD */}

                <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">

                  {/* RECENT PROVIDERS */}

                  <section className="overflow-hidden rounded-[1.6rem] border border-black/[0.06] bg-white/90 shadow-[0_4px_24px_rgba(15,23,42,0.03)] backdrop-blur-md">
                    <div className="flex items-center justify-between border-b border-black/[0.06] p-5 sm:px-6">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Recent providers
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Latest provider listings
                        </p>
                      </div>

                      <button
                        onClick={() => setPage("providers")}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
                      >
                        View all
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {providers.slice(0, 5).map((provider) => (
                        <motion.div
                          key={provider._id}
                          whileHover={{ backgroundColor: "rgba(236, 253, 245, 0.5)" }}
                          className="flex items-center justify-between gap-3 px-5 py-4 transition-colors sm:px-6"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[1.25rem] bg-emerald-100 font-bold text-emerald-800">
                              {provider.name?.charAt(0)?.toUpperCase() || "P"}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {provider.name}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-slate-400">
                                {provider.category || "Other"} ·{" "}
                                {provider.city ||
                                  provider.location ||
                                  "Location unavailable"}
                              </p>
                            </div>
                          </div>

                          <Badge status={provider.verificationStatus} />
                        </motion.div>
                      ))}

                      {!providers.length && (
                        <div className="p-10 text-center text-sm text-slate-400">
                          No providers have been added yet.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* QUICK ACTIONS */}

                  <section className="rounded-[1.6rem] border border-black/[0.06] bg-white/90 p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)] backdrop-blur-md sm:p-6">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Marketplace operations
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Quick access to administration tools
                      </p>
                    </div>

                    <div className="mt-5 space-y-3">
                      {[
                        {
                          label: "Add provider",
                          description: "Create a provider listing",
                          icon: Plus,
                          action: openAdd,
                        },
                        {
                          label: "Manage providers",
                          description: "Edit, verify and remove listings",
                          icon: BriefcaseBusiness,
                          action: () => setPage("providers"),
                        },
                        {
                          label: "Customers",
                          description: "Customer management section",
                          icon: Users,
                          action: () => setPage("users"),
                        },
                        {
                          label: "Bookings",
                          description: "Booking management section",
                          icon: CalendarCheck,
                          action: () => setPage("bookings"),
                        },
                        {
                          label: "Complaints",
                          description: "Complaint management section",
                          icon: MessageSquareWarning,
                          action: () => setPage("complaints"),
                        },
                      ].map((item) => {
                        const Icon = item.icon;

                        return (
                          <motion.button
                            key={item.label}
                            whileHover={{ x: 4, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            onClick={item.action}
                            className="group flex w-full items-center gap-3 rounded.35rem] border border-black/[0.06] p-3 text-left transition-colors hover:border-emerald-500/20 hover:bg-emerald-50/50"
                          >
                            <span className="rounded-[1.25rem] bg-emerald-100/70 p-3 text-emerald-800 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                              <Icon size={19} />
                            </span>

                            <span className="min-w-0 flex-1">
                              <strong className="block text-sm text-slate-800">
                                {item.label}
                              </strong>
                              <small className="text-xs text-slate-400">
                                {item.description}
                              </small>
                            </span>

                            <ArrowUpRight
                              size={17}
                              className="text-slate-400 transition-colors group-hover:text-emerald-700"
                            />
                          </motion.button>
                        );
                      })}
                    </div>
                  </section>
                </div>

                {/* FOOTER */}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] bg-[#111b18] p-6 text-white shadow-lg">
                  <div>
                    <p className="text-sm font-bold">
                      CREDENCE Administration
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-100/70">
                      Service marketplace management workspace
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    Admin session active
                  </div>
                </div>
              </div>
            )}

            {/* =========================================
                PROVIDERS
            ========================================= */}

            {page === "providers" && (
              <section className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">
                      Marketplace management
                    </p>
                    <h1 className="mt-1.5 text-3xl font-bold text-slate-950">
                      Service providers
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Manage provider listings shown on CREDENCE.
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={openAdd}
                    className="inline-flex items-center gap-2 rounded-[1.35rem] bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-800"
                  >
                    <Plus size={17} />
                    Add provider
                  </motion.button>
                </div>

                {/* FILTERS */}

                <div className="grid gap-3 sm:grid-cols-[1fr_190px_190px_auto]">
                  <label className="relative">
                    <Search
                      size={17}
                      className="absolute left-3.5 top-3.5 text-slate-400"
                    />
                    <input
                      className={`${inputClass} pl-10`}
                      placeholder="Search name, service, location..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>

                  <select
                    className={inputClass}
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="">All categories</option>
                    {[...new Set([...categories, ...categoriesInUse])].map(
                      (category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      )
                    )}
                  </select>

                  <select
                    className={inputClass}
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="">All verification</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => void fetchProviders()}
                    className="inline-flex items-center justify-center gap-2 rounded-[1.35rem] border border-black/[0.08] bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-emerald-50/70"
                  >
                    <RefreshCw size={16} />
                    Refresh
                  </motion.button>
                </div>

                {/* PROVIDER TABLE */}

                <div className="overflow-hidden rounded-[1.6rem] border border-black/[0.06] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left">
                      <thead className="bg-emerald-50/60 border-b border-black/[0.05]">
                        <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-4">Provider</th>
                          <th className="px-6 py-4">Service</th>
                          <th className="px-6 py-4">Location</th>
                          <th className="px-6 py-4">Starting price</th>
                          <th className="px-6 py-4">Verification</th>
                          <th className="px-6 py-4">Publishing</th>
                          <th className="px-6 py-4">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredProviders.map((provider) => (
                          <motion.tr
                            key={provider._id}
                            whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)" }}
                            className="transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {provider.profileImage ? (
                                  <img
                                    src={provider.profileImage}
                                    alt={provider.name}
                                    className="h-10 w-10 shrink-0 rounded-[1.25rem] object-cover ring-1 ring-black/5"
                                  />
                                ) : (
                                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[1.25rem] bg-emerald-100 font-bold text-emerald-800">
                                    {provider.name?.charAt(0)?.toUpperCase() || "P"}
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <p className="max-w-[190px] truncate text-sm font-semibold text-slate-900">
                                    {provider.name}
                                  </p>
                                  <p className="max-w-[190px] truncate text-xs text-slate-400">
                                    {provider.title ||
                                      provider.email ||
                                      "Service provider"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                              {provider.category ||
                                provider.categories?.join(", ") ||
                                "—"}
                            </td>

                            <td className="px-6 py-4 text-sm text-slate-600">
                              {provider.city ||
                                provider.location ||
                                provider.area ||
                                "—"}
                            </td>

                            <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                              {money(provider.startingPrice)}
                            </td>

                            <td className="px-6 py-4">
                              <Badge status={provider.verificationStatus} />
                            </td>

                            <td className="px-6 py-4">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${provider.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                {provider.status === "published" ? "Published" : "Draft"}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <button
                                  title="View"
                                  onClick={() => setViewProvider(provider)}
                                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                >
                                  <Eye size={16} />
                                </button>

                                <button
                                  title="Edit"
                                  onClick={() => openEdit(provider)}
                                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                                >
                                  <Pencil size={16} />
                                </button>

                                <button
                                  title={provider.status === "published" ? "Unpublish" : "Publish"}
                                  onClick={() => void updateProviderStatus(provider, provider.status === "published" ? "draft" : "published")}
                                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${provider.status === "published" ? "text-amber-700 hover:bg-amber-50" : "text-emerald-700 hover:bg-emerald-50"}`}
                                >
                                  {provider.status === "published" ? "Unpublish" : "Publish"}
                                </button>
                                
                                <button
                                  title="Delete"
                                  onClick={() => void deleteProvider(provider)}
                                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-400">
                      <RefreshCw size={16} className="animate-spin" />
                      Loading providers...
                    </div>
                  ) : filteredProviders.length === 0 ? (
                    <div className="p-12 text-center">
                      <BriefcaseBusiness
                        size={28}
                        className="mx-auto text-slate-300"
                      />
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        No providers found
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Try another search or add a provider.
                      </p>
                    </div>
                  ) : (
                    <div className="border-t border-black/[0.06] px-6 py-3 text-xs font-medium text-slate-400">
                      Showing {filteredProviders.length} of {providers.length} providers
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* =========================================
                BOOKINGS
            ========================================= */}

            {page === "bookings" && (
              <section className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">
                      Marketplace management
                    </p>
                    <h1 className="mt-1.5 text-3xl font-bold text-slate-950">Bookings</h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Review customer requests and manage each booking lifecycle.
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => void fetchBookings()}
                    disabled={bookingLoading}
                    className="inline-flex items-center gap-2 rounded-[1.35rem] border border-black/[0.08] bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={bookingLoading ? "animate-spin" : ""} />
                    Refresh
                  </motion.button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Total bookings", value: bookingTotal, tone: "text-slate-950" },
                    { label: "Pending on page", value: bookings.filter((b) => b.status === "pending").length, tone: "text-amber-600" },
                    { label: "Completed on page", value: bookings.filter((b) => b.status === "completed").length, tone: "text-emerald-700" },
                    { label: "Cancelled on page", value: bookings.filter((b) => b.status === "cancelled").length, tone: "text-rose-600" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.6rem] border border-black/[0.06] bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
                      <p className="text-sm font-medium text-slate-500">{item.label}</p>
                      <p className={`mt-2 text-3xl font-bold ${item.tone}`}>
                        {bookingLoading ? "..." : item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 rounded-[1.6rem] border border-black/[0.06] bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,0.03)] sm:grid-cols-[1fr_210px]">
                  <label className="relative">
                    <Search size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      className={`${inputClass} pl-10`}
                      placeholder="Search customer or provider..."
                      value={bookingSearch}
                      onChange={(event) => {
                        setBookingSearch(event.target.value);
                        setBookingPage(1);
                      }}
                    />
                  </label>
                  <select
                    className={inputClass}
                    value={bookingStatusFilter}
                    onChange={(event) => {
                      setBookingStatusFilter(event.target.value);
                      setBookingPage(1);
                    }}
                  >
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {bookingError && (
                  <div className="flex items-center justify-between rounded-[1.35rem] border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                    <span>{bookingError}</span>
                    <button onClick={() => setBookingError("")} aria-label="Dismiss error"><X size={17} /></button>
                  </div>
                )}

                <div className="overflow-hidden rounded-[1.6rem] border border-black/[0.06] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left">
                      <thead className="bg-slate-50 border-b border-black/[0.05] text-xs uppercase tracking-wider text-slate-500 font-bold">
                        <tr>
                          <th className="px-6 py-4">Customer</th>
                          <th className="px-6 py-4">Service / Provider</th>
                          <th className="px-6 py-4">Date & time</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Payment</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bookings.map((booking) => {
                          const statusTone: Record<BookingStatus, string> = {
                            pending: "bg-amber-50 text-amber-700 ring-amber-500/20",
                            confirmed: "bg-blue-50 text-blue-700 ring-blue-500/20",
                            "in-progress": "bg-violet-50 text-violet-700 ring-violet-500/20",
                            completed: "bg-emerald-50 text-emerald-700 ring-emerald-500/20",
                            cancelled: "bg-slate-100 text-slate-600 ring-slate-500/20",
                            rejected: "bg-rose-50 text-rose-700 ring-rose-500/20",
                          };
                          return (
                            <motion.tr
                              key={booking._id}
                              whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)" }}
                              className="transition-colors"
                            >
                              <td className="px-6 py-4">
                                <p className="font-semibold text-slate-800">{booking.customer?.name || "Customer unavailable"}</p>
                                <p className="mt-0.5 text-xs text-slate-400">{booking.customer?.email || "No email"}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-semibold text-slate-800">{booking.serviceName || booking.service || booking.provider?.title || booking.provider?.category || "Service booking"}</p>
                                <p className="mt-0.5 text-xs text-slate-400">{booking.provider?.name || "Provider unavailable"}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium text-slate-700">
                                  {booking.bookingDate || booking.date ? new Date(booking.bookingDate || booking.date || "").toLocaleDateString("en-IN") : "—"}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">{booking.bookingTime || booking.time || "Time not set"}</p>
                              </td>
                              <td className="px-6 py-4 font-semibold text-slate-800">{money(booking.amount)}</td>
                              <td className="px-6 py-4">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${booking.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700" : booking.paymentStatus === "failed" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                                  {booking.paymentStatus || "pending"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusTone[booking.status]}`}>
                                  {booking.status.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => setSelectedBooking(booking)}
                                  className="rounded-xl border border-black/[0.08] px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                                >
                                  View details
                                </button>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {bookingLoading ? (
                    <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-400">
                      <RefreshCw size={17} className="animate-spin" /> Loading bookings...
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="p-12 text-center">
                      <CalendarCheck size={30} className="mx-auto text-slate-300" />
                      <p className="mt-3 font-semibold text-slate-700">No bookings found</p>
                      <p className="mt-1 text-sm text-slate-400">Try changing the search or status filter.</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] px-6 py-4">
                      <p className="text-xs font-medium text-slate-400">Showing {bookings.length} of {bookingTotal} bookings</p>
                      <div className="flex items-center gap-3">
                        <button disabled={bookingPage <= 1 || bookingLoading} onClick={() => setBookingPage((current) => current - 1)} className="rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Previous</button>
                        <span className="text-xs text-slate-500 font-medium">Page {bookingPage} of {bookingPages}</span>
                        <button disabled={bookingPage >= bookingPages || bookingLoading} onClick={() => setBookingPage((current) => current + 1)} className="rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Next</button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* =========================================
                CUSTOMERS
            ========================================= */}

            {page === "users" && (
              <section className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Marketplace management</p>
                    <h1 className="mt-1.5 text-3xl font-bold text-slate-950">Customers</h1>
                    <p className="mt-1 text-sm text-slate-500">View and manage all registered customer accounts.</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => void fetchCustomers()}
                    disabled={customerLoading}
                    className="inline-flex items-center gap-2 rounded-[1.35rem] border border-black/[0.08] bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={customerLoading ? "animate-spin" : ""} /> Refresh
                  </motion.button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <StatCard label="Registered customers" value={customerTotal.toLocaleString("en-IN")} icon={Users} note="All customer accounts" loading={customerLoading} />
                  <StatCard label="Customers on page" value={customers.length} icon={Activity} note="Currently displayed records" loading={customerLoading} />
                </div>

                <div className="rounded-[1.6rem] border border-black/[0.06] bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
                  <label className="relative block">
                    <Search size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      className={`${inputClass} pl-10`}
                      placeholder="Search customer name, email or phone..."
                      value={customerSearch}
                      onChange={(event) => { setCustomerSearch(event.target.value); setCustomerPage(1); }}
                    />
                  </label>
                </div>

                {customerError && (
                  <div className="flex items-center justify-between rounded-[1.35rem] border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                    <span>{customerError}</span>
                    <button onClick={() => void fetchCustomers()} className="font-semibold underline">Retry</button>
                  </div>
                )}

                <div className="overflow-hidden rounded-[1.6rem] border border-black/[0.06] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                      <thead className="bg-slate-50 border-b border-black/[0.05] text-xs uppercase tracking-wider text-slate-500 font-bold">
                        <tr>
                          <th className="px-6 py-4">Customer</th>
                          <th className="px-6 py-4">Email</th>
                          <th className="px-6 py-4">Phone</th>
                          <th className="px-6 py-4">Joined</th>
                          <th className="px-6 py-4">Account</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customers.map((customer) => (
                          <motion.tr
                            key={customer._id}
                            whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)" }}
                            className="transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {customer.profileImage ? (
                                  <img src={customer.profileImage} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5" />
                                ) : (
                                  <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-800">{(customer.name || "C").charAt(0).toUpperCase()}</div>
                                )}
                                <div>
                                  <p className="font-semibold text-slate-800">{customer.name || "Unnamed customer"}</p>
                                  <p className="mt-0.5 text-xs text-slate-400">ID: {customer._id.slice(-8)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-600">{customer.email || "—"}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{customer.phone || "—"}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                            <td className="px-6 py-4">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${customer.isActive === false ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{customer.isActive === false ? "Inactive" : "Active"}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <button onClick={() => setSelectedCustomer(customer)} title="View details" className="rounded-lg border border-black/[0.08] p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"><Eye size={15} /></button>
                                <button onClick={() => openCustomerEdit(customer)} title="Edit customer" className="rounded-lg border border-black/[0.08] p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"><Pencil size={15} /></button>
                                <button onClick={() => void toggleCustomerStatus(customer)} disabled={customerActionId === customer._id} title={customer.isActive === false ? "Activate customer" : "Deactivate customer"} className={`rounded-lg border p-2 transition disabled:opacity-50 ${customer.isActive === false ? "border-black/[0.08] text-emerald-700 hover:bg-emerald-50" : "border-amber-200 text-amber-700 hover:bg-amber-50"}`}><ShieldCheck size={15} /></button>
                                <button onClick={() => void deleteCustomer(customer)} disabled={customerActionId === customer._id} title="Delete customer" className="rounded-lg border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"><Trash2 size={15} /></button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {customerLoading ? (
                    <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-400"><RefreshCw size={17} className="animate-spin" /> Loading customers...</div>
                  ) : customers.length === 0 ? (
                    <div className="p-12 text-center"><Users size={30} className="mx-auto text-slate-300" /><p className="mt-3 font-semibold text-slate-700">No customers found</p><p className="mt-1 text-sm text-slate-400">Try another search term.</p></div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] px-6 py-4">
                      <p className="text-xs font-medium text-slate-400">Showing {customers.length} of {customerTotal} customers</p>
                      <div className="flex items-center gap-3">
                        <button disabled={customerPage <= 1 || customerLoading} onClick={() => setCustomerPage((current) => current - 1)} className="rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Previous</button>
                        <span className="text-xs text-slate-500 font-medium">Page {customerPage} of {customerPages}</span>
                        <button disabled={customerPage >= customerPages || customerLoading} onClick={() => setCustomerPage((current) => current + 1)} className="rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Next</button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* =========================================
                COMPLAINTS
            ========================================= */}

            {page === "complaints" && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-[1.6rem] border border-black/[0.06] bg-white p-12 text-center shadow-[0_4px_24px_rgba(15,23,42,0.03)]"
              >
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.35rem] bg-emerald-50 text-emerald-700 shadow-inner">
                  <MessageSquareWarning size={28} />
                </div>
                <h2 className="mt-5 text-xl font-bold text-slate-900">Complaints</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  This management section will be connected separately.
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setPage("dashboard")}
                  className="mt-6 rounded-[1.35rem] bg-emerald-900 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-800"
                >
                  Back to dashboard
                </motion.button>
              </motion.div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* =========================================
          MODALS & TOAST
      ========================================= */}

      {/* ADD / EDIT PROVIDER MODAL */}

      {modalOpen && (
        <Modal
          title={editingProvider ? "Edit provider" : "Add new provider"}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={saveProvider} className="space-y-5">
            <div className="rounded-[1.35rem] border border-emerald-500/10 bg-emerald-50/50 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                {editingProvider
                  ? "Update provider listing"
                  : "Create a provider listing"}
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-800/70">
                The admin creates this provider profile directly. No provider
                login account is required.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Provider / business name *">
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </Field>

              <Field label="Service title">
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                />
              </Field>

              <Field label="Service category *">
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Provider type">
                <select className={inputClass} value={form.providerType} onChange={(event) => setForm({ ...form, providerType: event.target.value as ProviderType })}>
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                  <option value="company">Company</option>
                </select>
              </Field>

              <Field label="Listing status">
                <select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProviderStatus })}>
                  <option value="draft">Save as draft</option>
                  <option value="published">Publish immediately</option>
                </select>
              </Field>

              <Field label="Email address">
                <input
                  className={inputClass}
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </Field>

              <Field label="Contact phone *">
                <input
                  className={inputClass}
                  value={form.contactPhone}
                  onChange={(event) =>
                    setForm({ ...form, contactPhone: event.target.value })
                  }
                  required
                />
              </Field>

              <Field label="Starting price (₹)">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  value={form.startingPrice}
                  onChange={(event) =>
                    setForm({ ...form, startingPrice: event.target.value })
                  }
                />
              </Field>

              <Field label="Experience (years)">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  value={form.experienceYears}
                  onChange={(event) =>
                    setForm({ ...form, experienceYears: event.target.value })
                  }
                />
              </Field>

              <Field label="Service location *">
                <input
                  className={inputClass}
                  placeholder="e.g. Kochi, Kerala"
                  value={form.location}
                  onChange={(event) =>
                    setForm({ ...form, location: event.target.value })
                  }
                  required
                />
              </Field>

              <Field label="City / town">
                <input
                  className={inputClass}
                  value={form.city}
                  onChange={(event) =>
                    setForm({ ...form, city: event.target.value })
                  }
                />
              </Field>

              <Field label="Area / locality">
                <input
                  className={inputClass}
                  value={form.area}
                  onChange={(event) =>
                    setForm({ ...form, area: event.target.value })
                  }
                />
              </Field>

              <Field label="Full address">
                <input
                  className={inputClass}
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                />
              </Field>

              <Field label="Provider profile image" full>
                <div className="space-y-3 rounded-[1.35rem] border border-dashed border-black/[0.1] bg-emerald-50/30 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {form.profileImage ? (
                      <img
                        src={form.profileImage}
                        alt="Provider profile preview"
                        className="h-24 w-24 rounded-[1.35rem] border border-black/[0.08] bg-white object-cover shadow-sm"
                      />
                    ) : (
                      <div className="grid h-24 w-24 place-items-center rounded-[1.35rem] bg-white text-xs font-medium text-slate-400 ring-1 ring-slate-200">
                        No image
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-[1.35rem] bg-emerald-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                        <Plus size={16} />
                        {imageUploading ? "Uploading..." : "Choose image"}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={imageUploading}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            void handleProfileImageUpload(file);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                      <p className="mt-2 text-xs text-slate-500">
                        JPG, PNG or WEBP · Maximum 5 MB
                      </p>
                      {selectedImageName && (
                        <p className="mt-1 truncate text-xs text-slate-600">
                          {selectedImageName}
                        </p>
                      )}
                      {imageUploading && (
                        <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                          <RefreshCw size={13} className="animate-spin" />
                          Uploading image to Cloudinary...
                        </p>
                      )}
                      {form.profileImage && !imageUploading && (
                        <p className="mt-2 text-xs font-semibold text-emerald-700">
                          Image uploaded and ready to save.
                        </p>
                      )}
                    </div>

                    {form.profileImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm((current) => ({ ...current, profileImage: "" }));
                          setSelectedImageName("");
                        }}
                        className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                </div>
              </Field>

              <Field label="Description" full>
                <textarea
                  className={`${inputClass} min-h-28 resize-y`}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </Field>

              <label className="flex items-center gap-3 rounded-[1.35rem] border border-black/[0.08] p-3.5 text-sm font-medium text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      isAvailable: event.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-emerald-600 rounded"
                />
                Provider is currently available for bookings
              </label>
            </div>

            <div className="flex flex-col-reverse justify-end gap-2 border-t border-black/[0.06] pt-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-[1.35rem] border border-black/[0.08] px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                disabled={saving || imageUploading}
                className="inline-flex items-center justify-center gap-2 rounded-[1.35rem] bg-emerald-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60 shadow-md"
              >
                {saving ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}

                {saving
                  ? "Saving..."
                  : editingProvider
                    ? "Save changes"
                    : "Add provider"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* PROVIDER DETAILS */}

      {viewProvider && (
        <Modal
          title="Provider details"
          onClose={() => setViewProvider(null)}
        >
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              {viewProvider.profileImage ? (
                <img
                  src={viewProvider.profileImage}
                  alt={viewProvider.name}
                  className="h-14 w-14 rounded-[1.35rem] object-cover ring-1 ring-black/5"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-[1.35rem] bg-emerald-100 text-xl font-bold text-emerald-800">
                  {viewProvider.name?.charAt(0)?.toUpperCase() || "P"}
                </div>
              )}

              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900">
                  {viewProvider.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {viewProvider.title || viewProvider.category}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge status={viewProvider.verificationStatus} />
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    viewProvider.status === "published"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {viewProvider.status === "published" ? "Published" : "Draft"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Detail
                icon={BriefcaseBusiness}
                label="Category"
                value={viewProvider.category}
              />

              <Detail
                icon={BriefcaseBusiness}
                label="Provider type"
                value={viewProvider.providerType || "individual"}
              />

              <Detail
                icon={CheckCircle2}
                label="Listing status"
                value={viewProvider.status || "draft"}
              />

              <Detail
                icon={MapPin}
                label="Location"
                value={[
                  viewProvider.area,
                  viewProvider.city || viewProvider.location,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />

              <Detail
                icon={Phone}
                label="Phone"
                value={viewProvider.contact || viewProvider.contactPhone || viewProvider.phone}
              />

              <Detail
                icon={Mail}
                label="Email"
                value={viewProvider.email}
              />

              <Detail
                icon={CreditCard}
                label="Starting price"
                value={money(viewProvider.startingPrice)}
              />

              <Detail
                icon={Clock3}
                label="Experience"
                value={`${
                  viewProvider.experienceYears ??
                  viewProvider.experience ??
                  0
                } years`}
              />
            </div>

            {(viewProvider.description || viewProvider.bio) && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Description
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {viewProvider.description || viewProvider.bio}
                </p>
              </div>
            )}

            <div className="border-t border-black/[0.06] pt-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Publishing actions
              </p>
              <button
                onClick={() => void updateProviderStatus(viewProvider, viewProvider.status === "published" ? "draft" : "published")}
                className={`rounded-[1.35rem] px-4 py-2.5 text-sm font-semibold ${viewProvider.status === "published" ? "border border-amber-200 bg-amber-50 text-amber-700" : "bg-emerald-700 text-white"}`}
              >
                {viewProvider.status === "published" ? "Unpublish listing" : "Publish listing"}
              </button>
            </div>

            <div className="border-t border-black/[0.06] pt-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Verification actions
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    void updateVerification(viewProvider, "verified")
                  }
                  className="inline-flex items-center gap-2 rounded-[1.35rem] bg-emerald-700 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
                >
                  <CheckCircle2 size={15} />
                  Verify
                </button>

                <button
                  onClick={() =>
                    void updateVerification(viewProvider, "pending")
                  }
                  className="inline-flex items-center gap-2 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                >
                  <Clock3 size={15} />
                  Mark pending
                </button>

                <button
                  onClick={() =>
                    void updateVerification(viewProvider, "rejected")
                  }
                  className="inline-flex items-center gap-2 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <XCircle size={15} />
                  Reject
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-black/[0.06] pt-4">
              <button
                onClick={() => {
                  const provider = viewProvider;
                  setViewProvider(null);
                  openEdit(provider);
                }}
                className="inline-flex items-center gap-2 rounded-[1.35rem] border border-black/[0.08] px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50"
              >
                <Pencil size={15} />
                Edit
              </button>

              <button
                onClick={() => void deleteProvider(viewProvider)}
                className="inline-flex items-center gap-2 rounded-[1.35rem] bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CUSTOMER DETAILS MODAL */}
      
      {selectedCustomer && (
        <Modal title="Customer details" onClose={() => setSelectedCustomer(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {selectedCustomer.profileImage ? <img src={selectedCustomer.profileImage} alt="" className="h-16 w-16 rounded-full object-cover ring-1 ring-black/5" /> : <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800">{(selectedCustomer.name || "C").charAt(0).toUpperCase()}</div>}
              <div><h3 className="text-lg font-bold text-slate-900">{selectedCustomer.name || "Unnamed customer"}</h3><p className="text-sm text-slate-500">Customer account</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail icon={Mail} label="Email" value={selectedCustomer.email} />
              <Detail icon={Phone} label="Phone" value={selectedCustomer.phone} />
              <Detail icon={CalendarCheck} label="Registered" value={selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleString("en-IN") : undefined} />
              <Detail icon={ShieldCheck} label="Account status" value={selectedCustomer.isActive === false ? "Inactive" : "Active"} />
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-black/[0.06] pt-4">
              <button onClick={() => openCustomerEdit(selectedCustomer)} className="inline-flex items-center gap-2 rounded-[1.35rem] border border-black/[0.08] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Pencil size={15} /> Edit details</button>
              <button onClick={() => void toggleCustomerStatus(selectedCustomer)} disabled={customerActionId === selectedCustomer._id} className="rounded-[1.35rem] border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50">{selectedCustomer.isActive === false ? "Activate account" : "Deactivate account"}</button>
              <button onClick={() => void deleteCustomer(selectedCustomer)} disabled={customerActionId === selectedCustomer._id} className="inline-flex items-center gap-2 rounded-[1.35rem] bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"><Trash2 size={15} /> Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT CUSTOMER MODAL */}

      {editingCustomer && (
        <Modal title="Edit customer" onClose={() => setEditingCustomer(null)}>
          <form onSubmit={saveCustomer} className="space-y-4">
            <Field label="Full name">
              <input className={inputClass} value={customerForm.name} onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))} minLength={2} maxLength={100} required />
            </Field>
            <Field label="Email address">
              <input type="email" className={inputClass} value={customerForm.email} onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} required />
            </Field>
            <Field label="Phone number">
              <input type="tel" className={inputClass} value={customerForm.phone} onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))} maxLength={20} />
            </Field>
            <div className="flex justify-end gap-2 border-t border-black/[0.06] pt-4">
              <button type="button" onClick={() => setEditingCustomer(null)} className="rounded-[1.35rem] border border-black/[0.08] px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={customerSaving} className="inline-flex items-center gap-2 rounded-[1.35rem] bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{customerSaving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}{customerSaving ? "Saving..." : "Save changes"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* BOOKING DETAILS MODAL */}

      {selectedBooking && (
        <Modal title="Booking details" onClose={() => setSelectedBooking(null)} wide>
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail icon={Users} label="Customer" value={selectedBooking.customer?.name} />
              <Detail icon={Mail} label="Email" value={selectedBooking.customer?.email} />
              <Detail icon={BriefcaseBusiness} label="Provider" value={selectedBooking.provider?.name} />
              <Detail icon={Phone} label="Contact" value={selectedBooking.contactPhone || selectedBooking.customer?.phone} />
              <Detail icon={CalendarCheck} label="Booking date" value={selectedBooking.bookingDate || selectedBooking.date} />
              <Detail icon={Clock3} label="Booking time" value={selectedBooking.bookingTime || selectedBooking.time} />
              <Detail icon={MapPin} label="Location" value={selectedBooking.location || selectedBooking.provider?.location} />
              <Detail icon={CreditCard} label="Amount" value={money(selectedBooking.amount)} />
            </div>

            {selectedBooking.description && (
              <div className="rounded-[1.35rem] bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer notes</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{selectedBooking.description}</p>
              </div>
            )}

            <div className="rounded-[1.35rem] border border-emerald-500/10 bg-emerald-50/50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Manage booking status</p>
              <p className="mt-1 text-sm text-slate-600">Current status: <strong>{selectedBooking.status.replace("-", " ")}</strong></p>
              <div className="mt-4 flex flex-wrap gap-2">
                {({
                  pending: ["confirmed", "rejected", "cancelled"],
                  confirmed: ["in-progress", "cancelled"],
                  "in-progress": ["completed"],
                  completed: [],
                  cancelled: [],
                  rejected: [],
                } as Record<BookingStatus, BookingStatus[]>)[selectedBooking.status].map((nextStatus) => (
                  <button
                    key={nextStatus}
                    disabled={bookingUpdating === selectedBooking._id}
                    onClick={() => void updateBookingStatus(selectedBooking, nextStatus)}
                    className="rounded-xl bg-emerald-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {bookingUpdating === selectedBooking._id ? "Updating..." : nextStatus.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </button>
                ))}
                {["completed", "cancelled", "rejected"].includes(selectedBooking.status) && (
                  <p className="text-xs text-slate-500">This booking has reached a final status.</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* TOAST */}

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 right-6 z-[70] max-w-[calc(100vw-40px)] rounded-[1.35rem] border border-white/20 bg-[#111b18]/95 px-5 py-3.5 text-sm font-medium text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}