import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  MapPin,
  Star,
  ArrowRight,
  Zap,
  Wrench,
  Wind,
  Sparkles,
  Paintbrush,
  Hammer,
  WashingMachine,
  Car,
  Heart,
  BadgeCheck,
  Compass,
  ChevronRight,
  ChevronDown,
  Eye,
  CalendarCheck,
  Users,
  Quote,
  X,
  Send,
  Loader2,
  MessageCircle,
  Minus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

// ========================================
// TYPES
// ========================================

type Provider = {
  _id?: string;
  id?: string;
  name?: string;
  businessName?: string;
  category?: string;
  categories?: string[];
  location?: string;
  city?: string;
  address?: string;
  averageRating?: number;
  reviewCount?: number;
  verificationStatus?: "pending" | "verified" | "rejected";
  price?: number;
  startingPrice?: number;
  badge?: string;
  profileImage?: string;
  image?: string;
  imageUrl?: string;
  description?: string;
  isPublished?: boolean;
  status?: string;
};

// ========================================
// SERVICE CATEGORIES
// ========================================

const allServices = [
  { name: "Electrical Services", icon: Zap, tag: "Quick fixes", image: "electrical.avif", category: "Electrical" },
  { name: "Plumbing", icon: Wrench, tag: "Same-day service", image: "plumbing.webp", category: "Plumbing" },
  { name: "Home Cleaning", icon: Sparkles, tag: "Deep cleaning", image: "home-cleaning.jpg", category: "Home Cleaning" },
  { name: "Painting", icon: Paintbrush, tag: "Interior & exterior", image: "painting.jpeg", category: "Painting" },
  { name: "Appliance Repair", icon: WashingMachine, tag: "All appliances", image: "appliance-repair.jpg", category: "Appliance Repair" },
  { name: "Vehicle Repair", icon: Car, tag: "Vehicle services", image: "vehicle-repair.avif", category: "Vehicle Support" },
];

// ========================================
// TESTIMONIALS
// ========================================

const testimonials = [
  {
    name: "Anjali Nair",
    location: "Calicut",
    rating: 5,
    initials: "AN",
    review:
      "Excellent service and professional behaviour. The booking process was simple and convenient.",
  },
  {
    name: "Vishnu Prasad",
    location: "Malappuram",
    rating: 5,
    initials: "VP",
    review:
      "I could compare different professionals and choose the right one. Very satisfied with the experience.",
  },
  {
    name: "Sneha K",
    location: "Nilambur",
    rating: 5,
    initials: "SK",
    review:
      "The platform is simple and trustworthy. Everything was handled smoothly and on time.",
  },
];

// ========================================
// FREQUENTLY ASKED QUESTIONS
// ========================================

const faqCategories = [
  {
    label: "About us",
    questions: [
      {
        question: "What is Credence?",
        answer:
          "Credence is a platform that helps you discover and connect with local service professionals for home repairs, maintenance, cleaning and other everyday needs.",
      },
      {
        question: "What makes Credence different from other service platforms?",
        answer:
          "Credence brings service categories and professional listings together in one place, helping customers compare options and find suitable local support more easily.",
      },
      {
        question: "Which locations does Credence serve?",
        answer:
          "Credence is focused on connecting customers with service professionals across Kerala. Available professionals may vary by town and service category.",
      },
      {
        question: "What types of services can I find on Credence?",
        answer:
          "You can explore services such as electrical work, plumbing, home cleaning, painting, appliance repair and vehicle support. More categories may be added over time.",
      },
      {
        question: "How can I contact Credence?",
        answer:
          "For questions or support, email hello@credence.in and include a short description of how we can help.",
      },
    ],
  },
  {
    label: "Order related",
    questions: [
      {
        question: "How do I book a professional?",
        answer:
          "Choose a service category or search for the help you need. Open a professional's profile, review the details and submit your booking request.",
      },
      {
        question: "How can I check my booking status?",
        answer:
          "Sign in to your Credence account and check your bookings area for the latest status and available booking details.",
      },
      {
        question: "Can I contact a professional before booking?",
        answer:
          "Use the contact or booking options shown on the professional's profile to clarify the work required before confirming the service.",
      },
      {
        question: "Can I reschedule a booking?",
        answer:
          "Contact the professional or Credence support as early as possible to request a new time. Rescheduling depends on the professional's availability.",
      },
      {
        question: "What should I do if a professional does not arrive?",
        answer:
          "Try contacting the professional using the details available for your booking. If you cannot reach them, contact Credence support with your booking reference.",
      },
    ],
  },
  {
    label: "Refund related",
    questions: [
      {
        question: "How do I request a refund?",
        answer:
          "Contact Credence support with your booking reference, payment details and reason for the request. The team can review the case and explain the next steps.",
      },
      {
        question: "How long does a refund take?",
        answer:
          "Processing time can depend on the payment method and the payment provider. Support will share the applicable status and guidance for your request.",
      },
      {
        question: "Can I get a refund if I cancel a booking?",
        answer:
          "Refund eligibility depends on the booking status and the cancellation conditions communicated for that service. Contact support before cancelling if you need clarification.",
      },
      {
        question: "What if I was charged but my booking was not confirmed?",
        answer:
          "Please contact support with the transaction reference and booking details so the payment and booking status can be checked.",
      },
    ],
  },
  {
    label: "Account related",
    questions: [
      {
        question: "How do I create a Credence account?",
        answer:
          "Open the sign-up page, enter the requested details and follow the instructions to create your customer account.",
      },
      {
        question: "I forgot my password. What should I do?",
        answer:
          "Use the password recovery option on the sign-in page if available. If you still cannot access your account, contact Credence support.",
      },
      {
        question: "Can I update my profile details?",
        answer:
          "Sign in and open your profile settings to review and update the details that are available for editing.",
      },
      {
        question: "How can I deactivate my account?",
        answer:
          "Contact Credence support from your registered email address and request help with account deactivation.",
      },
    ],
  },
  {
    label: "Payment related",
    questions: [
      {
        question: "What payment methods are accepted?",
        answer:
          "Available payment methods will be displayed during the booking or payment process. The options may vary depending on the service and current platform setup.",
      },
      {
        question: "When do I need to pay for a service?",
        answer:
          "Payment timing can depend on the service and the booking arrangement. Confirm the payment terms with the professional before work begins.",
      },
      {
        question: "Is it safe to make payments through Credence?",
        answer:
          "Always use the payment options presented through the official Credence platform and never share your OTP, password or full card credentials with anyone.",
      },
      {
        question: "Where can I find my payment receipt?",
        answer:
          "Check your booking or payment details after completing a transaction. If a receipt is not available, contact support with your transaction reference.",
      },
    ],
  },
];

// ========================================
// STATS (replace with your real numbers)
// ========================================

const stats = [
  { value: 50, suffix: "+", label: "towns covered across Kerala" },
  { value: 500, suffix: "+", label: "verified professionals" },
  { value: 2500, suffix: "+", label: "services completed" },
  { value: 4.8, suffix: "", decimals: 1, label: "average customer rating" },
];

function useCountUp(target: number, decimals = 0, duration = 1600) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
      setDisplay(target);
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(target * eased);
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, duration]);

  const text =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString("en-IN");

  return { ref, text };
}

function StatItem({
  value,
  suffix,
  decimals = 0,
  label,
}: {
  value: number;
  suffix: string;
  decimals?: number;
  label: string;
}) {
  const { ref, text } = useCountUp(value, decimals);

  return (
    <div ref={ref} className="px-4 text-center">
      <p className="text-3xl font-black tracking-tight text-emerald-700 sm:text-5xl">
        {text}
        {suffix}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-700 sm:text-base">
        {label}
      </p>
    </div>
  );
}

// ========================================
// PROVIDER HELPERS
// ========================================

function getProviderId(provider: Provider) {
  return provider._id || provider.id || "";
}

function getProviderName(provider: Provider) {
  return provider.businessName || provider.name || "Service Professional";
}

function getProviderCategory(provider: Provider) {
  return provider.category || provider.categories?.[0] || "General Services";
}

function getProviderLocation(provider: Provider) {
  return (
    provider.location ||
    [provider.address, provider.city].filter(Boolean).join(", ") ||
    "Kerala"
  );
}

function getProviderImage(provider: Provider) {
  return provider.profileImage || provider.imageUrl || provider.image || "";
}

function normalizeProviderResponse(payload: unknown): Provider[] {
  if (Array.isArray(payload)) return payload as Provider[];

  if (payload && typeof payload === "object") {
    const response = payload as {
      providers?: unknown;
      data?: unknown;
    };

    if (Array.isArray(response.providers)) {
      return response.providers as Provider[];
    }

    if (Array.isArray(response.data)) {
      return response.data as Provider[];
    }
  }

  return [];
}


// ========================================
// ORIN AI CHAT WIDGET
// ========================================

type OrinMessage = {
  role: "user" | "assistant";
  content: string;
};

function OrinWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<OrinMessage[]>([
    {
      role: "assistant",
      content:
        "Hey there! 👋 I'm ORIN, your Credence assistant. How can I help you today?",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  const sendMessage = async (value = input) => {
    const content = value.trim();
    if (!content || loading) return;

    const nextMessages: OrinMessage[] = [
      ...messages,
      { role: "user", content },
    ];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post(
        "/orin/chat",
        {
          messages: nextMessages.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
        },
        {
          timeout: 65000,
        }
      );
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            response.data?.reply ||
            "I couldn't prepare a response. Please try again.",
        },
      ]);
    } catch (error) {
      console.error("ORIN chat error:", error);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Find an electrician",
    "I need a plumber",
    "How can I book a service?",
  ];

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      {isOpen && (
        <section
          aria-label="ORIN AI chat"
          className="flex h-[min(620px,calc(100dvh-140px))] max-h-[calc(100dvh-120px)] min-h-0 w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl shadow-slate-900/20"
        >
          {/* Chat header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-600 px-5 py-7 text-white">
            <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white">
                <img src="/orin2.png" alt="ORIN robot" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black tracking-tight">ORIN AI</h3>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-100">
                  <span className="h-2 w-2 rounded-full bg-green-300" />
                  Your Credence Assistant
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Minimize ORIN"
                className="rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <Minus size={19} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close ORIN"
                className="rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>
            <p className="relative mt-4 text-xs leading-relaxed text-emerald-50">
              Your smart companion for finding trusted local professionals.
            </p>
          </div>

          {/* Conversation */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[#F8FBF9] p-4">
            <div className="text-center">
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-400 shadow-sm">
                TODAY
              </span>
            </div>

            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100">
                    <img src="/orin.png" alt="" className="h-full w-full object-contain" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user"
                    ? "rounded-br-md bg-emerald-700 text-white"
                    : "rounded-bl-md border border-slate-100 bg-white text-slate-700 shadow-sm"
                    }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <MessageCircle size={15} className="text-emerald-700" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
                  <Loader2 size={14} className="animate-spin text-emerald-600" />
                  ORIN is thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length === 1 && (
            <div className="border-t border-slate-100 bg-white px-4 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick suggestions
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessage(suggestion)}
                    disabled={loading}
                    className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message composer */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
            className="flex items-center gap-2 border-t border-slate-100 bg-white p-3"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask ORIN anything..."
              aria-label="Message ORIN"
              disabled={loading}
              className="min-w-0 flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:bg-emerald-50 focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-md shadow-emerald-700/20 transition hover:bg-emerald-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={17} />
            </button>
          </form>

        </section>
      )}

      {/* Floating ORIN image launcher */}
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "Close ORIN assistant" : "Open ORIN assistant"}
        aria-expanded={isOpen}
        className="group relative flex h-auto w-auto items-center justify-center border-0 bg-transparent p-0 shadow-none transition duration-300 hover:-translate-y-1 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-4"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 -z-10 rounded-full bg-emerald-400/30 blur-2xl animate-pulse"
        />
        <img
          src="/orin.png"
          alt="Ask ORIN"
          className="relative z-10 h-28 w-28 object-contain drop-shadow-[0_8px_12px_rgba(15,23,42,0.12)] transition-transform duration-300 group-hover:scale-105 sm:h-28 sm:w-28"
        />
      </button>
    </div>
  );
}

// ========================================
// HOME COMPONENT
// ========================================

export default function Home() {
  const navigate = useNavigate();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("Kochi");
  const [likedProviders, setLikedProviders] = useState<string[]>([]);
  const [activeFaqCategory, setActiveFaqCategory] = useState("About us");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // ========================================
  // LOAD PROVIDERS
  // ========================================

  useEffect(() => {
    let cancelled = false;

    const loadProviders = async () => {
      setProvidersLoading(true);
      setProvidersError("");

      try {
        const response = await api.get("/providers");

        const publishedProviders = normalizeProviderResponse(
          response.data
        ).filter(
          (provider) =>
            provider.isPublished !== false &&
            provider.status !== "draft"
        );

        if (!cancelled) {
          setProviders(publishedProviders);
        }
      } catch (error) {
        console.error("Unable to load Credence providers:", error);

        if (!cancelled) {
          setProviders([]);

          setProvidersError(
            "We couldn't load professionals right now. Please try again later."
          );
        }
      } finally {
        if (!cancelled) {
          setProvidersLoading(false);
        }
      }
    };

    void loadProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  // Show first four providers
  const featuredProviders = useMemo(
    () => providers.slice(0, 4),
    [providers]
  );

  // ========================================
  // SAVE PROVIDER
  // ========================================

  const toggleLike = (provider: Provider) => {
    const key = getProviderId(provider) || getProviderName(provider);

    setLikedProviders((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  // ========================================
  // SEARCH NAVIGATION
  // ========================================

  const openProfessionals = (category = "All") => {
    const query = new URLSearchParams();

    if (category !== "All") {
      query.set("category", category);
    }

    if (searchQuery.trim()) {
      query.set("search", searchQuery.trim());
    }

    if (location && location !== "All Kerala") {
      query.set("location", location);
    }

    const queryString = query.toString();

    navigate(
      `/professionals${queryString ? `?${queryString}` : ""}`
    );
  };

  // ========================================
  // PROVIDER NAVIGATION
  // ========================================

  const goToProvider = (provider: Provider) => {
    const id = getProviderId(provider);

    if (id) {
      navigate(`/professional/${id}`);
    }
  };

  const bookProvider = (provider: Provider) => {
    const id = getProviderId(provider);

    if (id) {
      navigate(`/professional/${id}?action=book`);
    } else {
      openProfessionals(getProviderCategory(provider));
    }
  };

  // ========================================
  // UI
  // ========================================

  return (
    <main className="min-h-screen bg-white font-sans text-slate-800 selection:bg-emerald-500/20 selection:text-emerald-900">

      {/* ========================================
          HERO SECTION
      ======================================== */}

      <section
        id="home"
        className="relative isolate overflow-hidden px-6 pb-24 pt-32 md:pb-32 md:pt-40"
      >
        <img
          src="/hero-background.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-center"
        />

        <div className="pointer-events-none absolute inset-0 -z-10 bg-white/10" />

        <div className="relative z-10 mx-auto max-w-5xl text-center">

          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800 shadow-sm">
            <BadgeCheck size={15} />
            Kerala's trusted service network
          </p>

          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Precision services,
            <br />
            <span className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-green-500 bg-clip-text text-transparent">
              Delivered instantly.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Skip the phone tag. Find local service professionals across Kerala
            with transparent quotes and a simpler way to get things done.
          </p>

          {/* Search form */}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              openProfessionals("All");
            }}
            className="mx-auto mt-10 max-w-3xl rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl shadow-slate-900/5"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center">

              <label className="flex flex-1 items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20">
                <Search size={18} className="shrink-0 text-emerald-600" />

                <input
                  type="text"
                  placeholder="Search electrician, plumber, service..."
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 md:w-52">
                <MapPin size={18} className="shrink-0 text-emerald-600" />

                <select
                  aria-label="Select location"
                  value={location}
                  onChange={(event) =>
                    setLocation(event.target.value)
                  }
                  className="w-full cursor-pointer bg-transparent text-sm text-slate-800 outline-none"
                >
                  <option value="Kochi">Kochi</option>
                  <option value="Malappuram">Malappuram</option>
                  <option value="Calicut">Calicut</option>
                  <option value="Manjeri">Manjeri</option>
                  <option value="All Kerala">All Kerala</option>
                </select>
              </label>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-500 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-600/25 transition hover:brightness-110 active:scale-95"
              >
                <Compass size={16} />
                Explore
              </button>

            </div>
          </form>
        </div>
      </section>

      {/* ========================================
          STATS (animated count-up)
          Background: White
      ======================================== */}

      <section
        aria-label="Credence in numbers"
        className="bg-white py-14 sm:py-16"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-y-10 px-6 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-slate-200">
          {stats.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      {/* ========================================
          POPULAR SERVICE CATEGORIES
          Background: Soft Mint
      ======================================== */}

      <section
        id="services"
        className="bg-[#EAF5EF] py-14"
      >
        <div className="mx-auto max-w-7xl px-4">

          <div className="mb-7 flex items-end justify-between gap-4">

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                Explore our services
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
                Popular Service Categories
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Choose from a wide range of trusted services.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openProfessionals("All")}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 transition hover:text-emerald-900"
            >
              View All <ArrowRight size={14} />
            </button>

          </div>

          <div className="-mx-8 flex snap-x snap-mandatory items-stretch gap-2 overflow-x-auto px-0 pb-3 [scrollbar-width:thin] sm:gap-3">
            {allServices.map((category) => {
              const Icon = category.icon;

              return (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => openProfessionals(category.category)}
                  className="group w-[112px] shrink-0 snap-start overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md sm:w-[185px]"
                >
                  <div className="relative flex h-[100px] items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                    <Icon size={25} strokeWidth={1.6} className="text-emerald-700" />
                    <img
                      src={category.image}
                      alt={category.name}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 "
                    />
                  </div>
                  <h3 className="mt-1.5 line-clamp-2 min-h-[28px] text-[10px] font-extrabold leading-tight text-slate-800 transition group-hover:text-emerald-700 sm:text-[13px]">
                    {category.name}
                  </h3>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => navigate("/service")}
              className="group flex w-[112px] shrink-0 snap-start flex-col items-center justify-center rounded-xl border border-emerald-100 bg-white p-2 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md sm:w-[122px]"
            >
              <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
                <ChevronRight size={19} />
              </span>
              <span className="text-[10px] font-extrabold text-slate-800 sm:text-[11px]">
                More Categories
              </span>
              <span className="mt-1 text-[9px] text-slate-500">Explore all</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================
          FEATURED PROFESSIONALS
          Background: White
      ======================================== */}

      <section
        id="professionals"
        className="bg-white py-16"
      >
        <div className="mx-auto max-w-7xl px-6">

          <div className="mb-8 flex items-end justify-between gap-4">

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                Trusted service network
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
                Featured Professionals Near You
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Top-rated and verified service providers in your area.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/professionals")}
              className="flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 transition hover:text-emerald-900"
            >
              View All <ArrowRight size={14} />
            </button>

          </div>

          {/* Loading */}

          {providersLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-80 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>

          ) : providersError ? (

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              {providersError}
            </div>

          ) : featuredProviders.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">

              <BadgeCheck
                size={36}
                className="mx-auto text-emerald-600"
              />

              <h3 className="mt-3 font-bold text-slate-900">
                No professionals to display yet
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Providers published from the admin panel will appear here.
              </p>

              <button
                type="button"
                onClick={() => openProfessionals("All")}
                className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
              >
                Browse professionals
              </button>

            </div>

          ) : (

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

              {featuredProviders.map((provider) => {
                const id = getProviderId(provider);
                const name = getProviderName(provider);
                const likedKey = id || name;
                const image = getProviderImage(provider);
                const price = provider.startingPrice ?? provider.price;

                return (
                  <article
                    key={likedKey}
                    className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl"
                  >

                    {/* Provider image */}

                    <div className="relative h-60 overflow-hidden rounded-xl bg-emerald-50">

                      <div className="flex h-full items-center justify-center text-emerald-700">
                        <Users size={40} />
                      </div>

                      {image && (
                        <img
                          src={image}
                          alt={`${name} profile`}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 "
                        />
                      )}

                      {/* Verification */}

                      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1.5 text-[10px] font-bold text-emerald-800 shadow-sm">
                        <BadgeCheck
                          size={13}
                          className="text-emerald-600"
                        />

                        {provider.verificationStatus === "verified"
                          ? "Verified"
                          : "Professional"}
                      </div>

                      {/* Save button */}

                      <button
                        type="button"
                        aria-label={
                          likedProviders.includes(likedKey)
                            ? "Remove from saved providers"
                            : "Save provider"
                        }
                        onClick={() => toggleLike(provider)}
                        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-rose-500 shadow-sm transition hover:scale-110"
                      >
                        <Heart
                          size={16}
                          className={
                            likedProviders.includes(likedKey)
                              ? "fill-rose-500 text-rose-500"
                              : ""
                          }
                        />
                      </button>

                    </div>

                    {/* Provider information */}

                    <div className="px-1 pb-1 pt-4">

                      <div className="flex items-start justify-between gap-2">

                        <div className="min-w-0">

                          <h3 className="truncate text-base font-extrabold text-slate-900">
                            {name}
                          </h3>

                          <p className="mt-1 truncate text-sm font-medium text-emerald-700">
                            {getProviderCategory(provider)}
                          </p>

                        </div>

                        {/* Rating + review count in brackets */}

                        <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-amber-500">
                          <Star
                            size={14}
                            className="fill-amber-400 text-amber-400"
                          />

                          {provider.averageRating
                            ? provider.averageRating.toFixed(1)
                            : "New"}

                          {provider.averageRating && provider.reviewCount ? (
                            <span className="font-medium text-slate-400">
                              ({provider.reviewCount})
                            </span>
                          ) : null}
                        </div>

                      </div>

                      <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-slate-500">
                        <MapPin
                          size={14}
                          className="shrink-0 text-emerald-600"
                        />

                        {getProviderLocation(provider)}
                      </p>

                      {/* Starting price */}

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">

                        <span className="text-xs font-medium text-slate-500">
                          Starting from
                        </span>

                        <span className="text-2xl font-black text-slate-900">
                          {price != null ? `₹${price}` : "Quote"}
                        </span>

                      </div>

                      {/* View and Book buttons */}

                      <div className="mt-4 grid grid-cols-2 gap-2">

                        <button
                          type="button"
                          onClick={() => goToProvider(provider)}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
                        >
                          <Eye size={17} />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => bookProvider(provider)}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-2 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
                        >
                          <CalendarCheck size={17} />
                          Book
                        </button>

                      </div>

                    </div>
                  </article>
                );
              })}

            </div>
          )}

        </div>
      </section>

      {/* ========================================
          MOBILE APP
          Background: White
          Existing banner retained
      ======================================== */}

      <section
        id="app"
        className="bg-white py-12"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <a
            href="mailto:hello@credence.in?subject=Credence%20app%20launch%20updates"
            aria-label="Get Credence app launch updates"
            className="group block overflow-hidden rounded-2xl bg-slate-950 shadow-xl transition hover:shadow-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/40"
          >
            <img
              src="/credence-app-banner.png"
              alt="Get the Credence app. Book trusted home services anytime, anywhere."
              className="block h-auto w-full object-cover transition duration-500 group-hover:brightness-105"
              loading="lazy"
            />
          </a>

          <p className="mt-3 text-center text-xs text-slate-500">
            App download links and QR code should be connected before launch.
          </p>

        </div>
      </section>

      {/* ========================================
          NEED HELP / EMERGENCY
          Background: White
          Existing red design retained
      ======================================== */}

      <section
        id="pulse"
        className="bg-white py-12"
      >
        <div className="mx-auto max-w-7xl px-6">

          <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-r from-red-50 via-red-50/70 to-red-50 p-8 shadow-sm">

            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />

            <div className="relative z-10 grid gap-6 md:grid-cols-[1.5fr_1fr] md:items-center">

              <div>

                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-100 px-3 py-1.5 text-[10px] font-bold text-red-800">
                  <span className="h-2 w-2 animate-ping rounded-full bg-red-600" />
                  Emergency assistance
                </div>

                <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
                  Need help right now?
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Describe your issue and explore professionals who can help.
                </p>

              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  openProfessionals("All");
                }}
                className="flex flex-col gap-3 sm:flex-row md:justify-end"
              >

                <label
                  className="sr-only"
                  htmlFor="emergency-search"
                >
                  Describe your issue
                </label>

                <input
                  id="emergency-search"
                  type="text"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  placeholder="Describe your issue..."
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-red-500"
                />

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:bg-red-500"
                >
                  Find Help
                  <ArrowRight size={15} />
                </button>

              </form>

            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          CUSTOMER TESTIMONIALS
          Background: Soft Mint
      ======================================== */}

      <section
        className="border-y border-gray-100 bg-[#e8e8e8] py-16"
      >
        <div className="mx-auto max-w-7xl px-6">

          <div className="mb-9 flex items-end justify-between gap-4">

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                Customer experiences
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
                What Our Customers Say
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Real experiences from people who trust Credence.
              </p>

            </div>

            <div className="hidden items-center gap-2 sm:flex">

              <button
                type="button"
                aria-label="Previous testimonials"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-white text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
              >
                <ChevronRight
                  size={18}
                  className="rotate-180"
                />
              </button>

              <button
                type="button"
                aria-label="Next testimonials"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-white text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
              >
                <ChevronRight size={18} />
              </button>

            </div>

          </div>

          <div className="grid gap-5 md:grid-cols-3">

            {testimonials.map((testimonial) => (
              <article
                key={testimonial.name}
                className="rounded-2xl border border-white bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >

                <div className="flex items-center justify-between">

                  <div className="flex gap-1 text-amber-400">
                    {Array.from({
                      length: testimonial.rating,
                    }).map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className="fill-amber-400"
                      />
                    ))}
                  </div>

                  <Quote
                    size={25}
                    className="text-emerald-100"
                  />

                </div>

                <p className="mt-5 min-h-[80px] text-sm leading-relaxed text-slate-600">
                  “{testimonial.review}”
                </p>

                <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-800">
                    {testimonial.initials}
                  </div>

                  <div>

                    <h3 className="text-sm font-extrabold text-slate-900">
                      {testimonial.name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {testimonial.location}
                    </p>

                  </div>

                </div>

              </article>
            ))}

          </div>
        </div>
      </section>

      {/* ========================================
          FOR PROFESSIONALS / FOR CUSTOMERS CTA
          Background: White
      ======================================== */}


      {/* CREDENCE PROFESSIONAL & CUSTOMER CTA */}

      <section className="relative overflow-hidden bg-[#e8e8e8] px-5 pb-16 pt-14 sm:px-8 sm:pb-20">

        {/* Curved white background */}
        <div className="absolute bottom-0 left-[-10%] h-[75%] w-[120%] rounded-[50%_50%_0_0] bg-white" />

        <div className="relative mx-auto grid max-w-5xl items-stretch md:grid-cols-2">

          {/* PROFESSIONAL CARD */}
          <div className="relative z-10 flex min-h-[330px] flex-col items-start justify-center rounded-[36px] border border-slate-300 bg-gradient-to-br from-white to-[#e8e8e8] px-8 pb-10 pt-14 shadow-[0_15px_35px_rgba(0,0,0,0.13)] sm:px-11">

            <span className="absolute left-10 top-0 -translate-y-px -skew-x-12 rounded-b-lg bg-black px-5 py-2 text-xs font-bold uppercase tracking-wide text-white">
              <span className="block skew-x-12">For Professionals</span>
            </span>

            <h2 className="max-w-sm text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">
              Grow your business with Credence.
            </h2>

            <p className="mt-5 text-lg font-medium text-slate-600 sm:text-xl">
              Get discovered by more customers.
            </p>

            <a
              href="mailto:hello@credence.in?subject=Professional%20Partnership"
              className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-4 text-base font-bold text-black transition hover:bg-emerald-50"
            >
              Partner with us
              <ArrowRight size={21} />
            </a>
          </div>

          {/* CUSTOMER CARD */}
          <div className="relative z-20 -mt-0 flex min-h-[330px] flex-col items-start justify-center rounded-[36px] border border-emerald-800 bg-[#0D6847] px-8 pb-10 pt-14 text-white shadow-[0_15px_35px_rgba(0,0,0,0.16)] md:-ml-6 sm:px-11">

            <span className="absolute left-10 top-0 -translate-y-px -skew-x-12 rounded-b-lg bg-black px-5 py-2 text-xs font-bold uppercase tracking-wide text-white">
              <span className="block skew-x-12">For Customers</span>
            </span>

            <h2 className="max-w-md text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Find trusted professionals, effortlessly.
            </h2>

            <p className="mt-5 text-lg font-medium text-emerald-100 sm:text-xl">
              Reliable help for every need.
            </p>

            <button
              type="button"
              onClick={() => navigate("/professionals")}
              className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-4 text-base font-bold text-black transition hover:bg-emerald-50"
            >
              Explore professionals
              <ArrowRight size={21} />
            </button>
          </div>

        </div>
      </section>


      {/* ========================================
          FREQUENTLY ASKED QUESTIONS
          Placed after the CTA cards
      ======================================== */}

      <section id="faq" className="bg-white px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Frequently asked questions
            </h2>
          </div>

          {/* FAQ category tabs */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
            {faqCategories.map((category) => {
              const isActive = activeFaqCategory === category.label;

              return (
                <button
                  key={category.label}
                  type="button"
                  onClick={() => {
                    setActiveFaqCategory(category.label);
                    setOpenFaq(null);
                  }}
                  aria-pressed={isActive}
                  className={`rounded-2xl border px-5 py-3.5 text-sm font-semibold transition duration-200 sm:px-6 sm:text-base ${
                    isActive
                      ? "border-emerald-700 bg-emerald-50 text-emerald-900 shadow-sm"
                      : "border-slate-200 bg-white text-slate-900 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/50"
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </div>

          {/* FAQ accordion list */}
          <div className="space-y-5">
            {faqCategories
              .find((category) => category.label === activeFaqCategory)
              ?.questions.map((faq, index) => {
                const isOpen = openFaq === index;

                return (
                  <article
                    key={faq.question}
                    className={`overflow-hidden rounded-[24px] border bg-white transition duration-300 ${
                      isOpen
                        ? "border-emerald-200 shadow-md shadow-slate-900/[0.04]"
                        : "border-slate-100 shadow-[0_5px_24px_rgba(15,23,42,0.035)] hover:border-emerald-200"
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${activeFaqCategory}-${index}`}
                      onClick={() =>
                        setOpenFaq((current) => (current === index ? null : index))
                      }
                      className="flex min-h-[82px] w-full items-center justify-between gap-5 px-6 py-5 text-left sm:px-8"
                    >
                      <span className="text-base font-semibold tracking-tight text-slate-950 sm:text-xl">
                        {faq.question}
                      </span>
                      <ChevronDown
                        size={21}
                        strokeWidth={1.8}
                        className={`shrink-0 text-slate-800 transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div
                        id={`faq-answer-${activeFaqCategory}-${index}`}
                        className="border-t border-slate-100 px-6 pb-6 pt-4 sm:px-8"
                      >
                        <p className="max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
        </div>
      </section>

      {/* PAGE BOTTOM SPACING */}

      <div className="h-10 bg-white" />

      {/* ORIN AI FLOATING ASSISTANT */}
      <OrinWidget />

    </main>
  );
}