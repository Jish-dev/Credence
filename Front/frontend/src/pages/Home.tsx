import { useEffect, useMemo, useState } from "react";
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
  Send,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

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

const allServices = [
  {
    name: "Electrical",
    icon: Zap,
    tag: "⚡ Quick fix",
    color: "from-emerald-500/10 to-green-500/10 text-emerald-600",
  },
  {
    name: "Plumbing",
    icon: Wrench,
    tag: "💧 Same-day",
    color: "from-emerald-500/10 to-teal-500/10 text-emerald-600",
  },
  {
    name: "AC Repair",
    icon: Wind,
    tag: "❄️ Servicing",
    color: "from-green-500/10 to-emerald-500/10 text-emerald-600",
  },
  {
    name: "Home Cleaning",
    icon: Sparkles,
    tag: "✨ Deep clean",
    color: "from-emerald-500/10 to-lime-500/10 text-emerald-600",
  },
  {
    name: "Painting",
    icon: Paintbrush,
    tag: "🎨 Interiors",
    color: "from-emerald-500/10 to-green-600/10 text-emerald-600",
  },
  {
    name: "Carpentry",
    icon: Hammer,
    tag: "🪵 Custom wood",
    color: "from-green-600/10 to-emerald-500/10 text-emerald-700",
  },
  {
    name: "Appliance Repair",
    icon: WashingMachine,
    tag: "🛠️ All brands",
    color: "from-teal-500/10 to-emerald-500/10 text-emerald-600",
  },
  {
    name: "Vehicle Support",
    icon: Car,
    tag: "🚗 On-site",
    color: "from-emerald-600/10 to-green-600/10 text-emerald-600",
  },
];

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

export default function Home() {
  const navigate = useNavigate();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("Kochi");
  const [likedProviders, setLikedProviders] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadProviders = async () => {
      setProvidersLoading(true);
      setProvidersError("");

      try {
        // Public API should return providers published from the admin panel.
        const response = await api.get("/providers");
        const publishedProviders = normalizeProviderResponse(response.data).filter(
          (provider) =>
            provider.isPublished !== false && provider.status !== "draft",
        );

        if (!cancelled) {
          setProviders(publishedProviders);
        }
      } catch (error) {
        console.error("Unable to load Credence providers:", error);

        if (!cancelled) {
          setProviders([]);
          setProvidersError(
            "We couldn't load professionals right now. Please try again later.",
          );
        }
      } finally {
        if (!cancelled) setProvidersLoading(false);
      }
    };

    void loadProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  const featuredProviders = useMemo(() => providers.slice(0, 3), [providers]);

  const toggleLike = (provider: Provider) => {
    const key = getProviderId(provider) || getProviderName(provider);

    setLikedProviders((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const openProfessionals = (category = "All") => {
    const query = new URLSearchParams();

    if (category !== "All") query.set("category", category);
    if (searchQuery.trim()) query.set("search", searchQuery.trim());
    if (location && location !== "All Kerala") query.set("location", location);

    const queryString = query.toString();
    navigate(`/professionals${queryString ? `?${queryString}` : ""}`);
  };

  const goToProvider = (provider: Provider) => {
    const id = getProviderId(provider);
    if (id) navigate(`/professional/${id}`);
  };

  const goToApp = () => {
    const appSection = document.getElementById("app");

    if (window.location.pathname !== "/") {
      navigate("/#app");
      return;
    }

    if (appSection) {
      appSection.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", "#app");
    }
  };

  return (
    <main className="min-h-screen bg-[#fafcfb] font-sans text-slate-800 selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Ambient background */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-500/10 via-green-500/5 to-transparent blur-[120px]" />

      {/* Hero */}
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
              delivered instantly.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Skip the phone tag. Find local service professionals across Kerala
            with transparent quotes and a simpler way to get things done.
          </p>

          {/* Search */}
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
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 md:w-52">
                <MapPin size={18} className="shrink-0 text-emerald-600" />
                <select
                  aria-label="Select location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
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

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck size={14} className="text-emerald-600" />
              Verified professionals
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star size={14} className="text-amber-500" />
              Compare service providers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} className="text-emerald-600" />
              Local service discovery
            </span>
          </div>
        </div>
      </section>

      {/* Horizontally scrollable domains */}
      <section id="services" className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              Specialized Craft
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
              Select a Domain
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Choose a service to explore matching professionals.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openProfessionals("All")}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 transition hover:text-emerald-900"
          >
            View all <ArrowRight size={14} />
          </button>
        </div>

        <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 [scrollbar-color:#a7f3d0_transparent] [scrollbar-width:thin]">
          {allServices.map((category) => {
            const Icon = category.icon;

            return (
              <button
                key={category.name}
                type="button"
                onClick={() => openProfessionals(category.name)}
                className="group relative w-56 shrink-0 snap-start overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl sm:w-60"
              >
                <div
                  className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${category.color} blur-xl transition group-hover:scale-150`}
                />

                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-sm transition group-hover:scale-110">
                    <Icon size={22} />
                  </div>
                  <span className="rounded-full border border-slate-200/60 bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                    {category.tag}
                  </span>
                </div>

                <div className="relative z-10 mt-6">
                  <h3 className="text-base font-extrabold text-slate-900 transition group-hover:text-emerald-700">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Explore professionals
                  </p>
                </div>

                <ArrowRight
                  size={16}
                  className="absolute bottom-5 right-5 text-emerald-600 transition group-hover:translate-x-1"
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* Admin-published providers */}
      <section id="professionals" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              Verified Network
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
              Elite Professionals on Duty
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Discover professionals published by the Credence team.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openProfessionals("All")}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
          >
            View All <ChevronRight size={16} />
          </button>
        </div>

        {providersLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-3xl bg-slate-100"
              />
            ))}
          </div>
        ) : providersError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            {providersError}
          </div>
        ) : featuredProviders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <BadgeCheck size={24} />
            </div>
            <h3 className="mt-3 font-bold text-slate-900">
              No professionals to display yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Providers published from the admin panel will appear here.
            </p>
            <button
              type="button"
              onClick={() => openProfessionals("All")}
              className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              Browse professionals
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProviders.map((provider) => {
              const id = getProviderId(provider);
              const name = getProviderName(provider);
              const likedKey = id || name;
              const image = getProviderImage(provider);
              const price = provider.startingPrice ?? provider.price;

              return (
                <article
                  key={likedKey}
                  onClick={() => goToProvider(provider)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") goToProvider(provider);
                  }}
                  role={id ? "link" : undefined}
                  tabIndex={id ? 0 : undefined}
                  className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm transition duration-300 hover:border-emerald-400/50 hover:shadow-xl"
                >
                  <div className="relative h-56 overflow-hidden rounded-2xl bg-emerald-50">
                    <div className="flex h-full w-full items-center justify-center text-emerald-700">
                      <BadgeCheck size={42} />
                    </div>
                    {image && (
                      <img
                        src={image}
                        alt={`${name} profile`}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/45 via-transparent to-transparent" />

                    <button
                      type="button"
                      aria-label={
                        likedProviders.includes(likedKey)
                          ? "Remove from saved providers"
                          : "Save provider"
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleLike(provider);
                      }}
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-sm backdrop-blur transition hover:scale-110"
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

                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-white/40 bg-white/90 px-3 py-1 text-[10px] font-bold text-emerald-800 shadow-sm backdrop-blur-md">
                      <BadgeCheck size={13} className="text-emerald-600" />
                      {provider.verificationStatus === "verified" ? "Verified Professional" : "Listed Professional"}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-extrabold text-slate-900">
                          {name}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-emerald-700">
                          {getProviderCategory(provider)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-amber-500">
                        <Star
                          size={13}
                          className="fill-amber-400 text-amber-400"
                        />
                        {provider.averageRating ? provider.averageRating.toFixed(1) : "New"}
                        {provider.reviewCount ? (
                          <span className="font-normal text-slate-400">
                            ({provider.reviewCount})
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin size={13} className="text-emerald-600" />
                      {getProviderLocation(provider)}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Starting price
                        </p>
                        <p className="text-lg font-black text-slate-900">
                          {price != null ? `₹${price}` : "Request quote"}
                          {price != null && (
                            <span className="text-xs font-normal text-slate-500">
                              {" "}
                              onwards
                            </span>
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          goToProvider(provider);
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-600"
                      >
                        View Profile <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* App banner */}
      <section
        id="app"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      >
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
      </section>

      {/* Emergency assistance */}
      <section id="pulse" className="mx-auto max-w-7xl px-6 py-12">
        <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-r from-red-50 via-red-50/70 to-red-50 p-8 shadow-sm">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />

          <div className="relative z-10 grid gap-6 md:grid-cols-[1.5fr_1fr] md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-100 px-3 py-1 text-[10px] font-bold text-red-800">
                <span className="h-2 w-2 animate-ping rounded-full bg-red-600" />
                Emergency assistance
              </div>
              <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
                Need help right now?
              </h2>
              <p className="mt-2 text-xs text-slate-600 sm:text-sm">
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
              <label className="sr-only" htmlFor="emergency-search">
                Describe your issue
              </label>
              <input
                id="emergency-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Describe your issue..."
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-red-500"
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:bg-red-500"
              >
                Find Help <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Small footer spacer for the page content */}
      <div className="h-8" />
      <button
        type="button"
        onClick={goToApp}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      >
        Go to app section
      </button>
    </main>
  );
}
