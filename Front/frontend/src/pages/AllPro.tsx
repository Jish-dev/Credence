import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Star,
  CalendarDays,
  ShieldCheck,
  Heart,
  Grid2X2,
  List,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Loader2,
  BriefcaseBusiness,
  X,
} from "lucide-react";
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
  rating?: number;
  reviewCount?: number;
  reviewsCount?: number;
  verificationStatus?: "pending" | "verified" | "rejected";
  isVerified?: boolean;
  price?: number;
  startingPrice?: number;
  availability?: string;
  availableToday?: boolean;
  profileImage?: string;
  image?: string;
  imageUrl?: string;
  description?: string;
  isPublished?: boolean;
  status?: string;
};

type ProviderResponse = Provider[] | { data?: Provider[]; providers?: Provider[]; results?: Provider[] };

const CATEGORIES = [
  { name: "Plumbing", count: 32 },
  { name: "Electrical", count: 0},
  { name: "AC Service", count: 0 },
  { name: "Home Cleaning", count: 0 },
  { name: "Carpentry", count: 0 },
  { name: "Painting", count: 0 },
];

const LOCATIONS = ["All Locations", "Malappuram", "Manjeri", "Nilambur", "Perinthalmanna", "Kondotty", "Kochi", "Calicut"];

function providerId(provider: Provider) {
  return provider._id || provider.id || "";
}
function providerName(provider: Provider) {
  return provider.businessName || provider.name || "Service Professional";
}
function providerCategory(provider: Provider) {
  return provider.category || provider.categories?.[0] || "General Services";
}
function providerLocation(provider: Provider) {
  return provider.location || provider.city || provider.address || "Kerala";
}
function providerImage(provider: Provider) {
  return provider.profileImage || provider.imageUrl || provider.image || "";
}
function providerRating(provider: Provider) {
  return Number(provider.averageRating ?? provider.rating ?? 0);
}
function providerReviews(provider: Provider) {
  return Number(provider.reviewCount ?? provider.reviewsCount ?? 0);
}
function providerPrice(provider: Provider) {
  return Number(provider.startingPrice ?? provider.price ?? 0);
}
function isVerified(provider: Provider) {
  return provider.isVerified === true || provider.verificationStatus === "verified";
}
function isAvailableToday(provider: Provider) {
  return provider.availableToday === true || provider.availability?.toLowerCase().includes("today") === true;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

// Visual direction: restrained, editorial marketplace styling rather than a glossy AI-generated look.
export default function AllProf() {
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [location, setLocation] = useState("All Locations");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("Highest Rated");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("credence_favorite_providers") || "[]");
    } catch {
      return [];
    }
  });

  const pageSize = 8;

  useEffect(() => {
    let active = true;
    const loadProfessionals = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get<ProviderResponse>("/providers");
        const payload = response.data;
        const rows = Array.isArray(payload)
          ? payload
          : payload?.data || payload?.providers || payload?.results || [];
        if (active) {
          setProfessionals(
            rows.filter((item) => item.isPublished !== false && item.status !== "draft")
          );
        }
      } catch (err) {
        console.error("Failed to load professionals:", err);
        if (active) setError("We couldn't load professionals right now. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadProfessionals();
    return () => {
      active = false;
    };
  }, []);

  const filteredProfessionals = useMemo(() => {
    let result = [...professionals];
    const term = searchTerm.trim().toLowerCase();

    if (term) {
      result = result.filter((provider) =>
        [providerName(provider), providerCategory(provider), providerLocation(provider), provider.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter((provider) => {
        const category = providerCategory(provider).toLowerCase();
        const categories = (provider.categories || []).map((item) => item.toLowerCase());
        return selectedCategories.some(
          (selected) => category === selected.toLowerCase() || categories.includes(selected.toLowerCase())
        );
      });
    }

    if (location !== "All Locations") {
      result = result.filter((provider) => providerLocation(provider).toLowerCase().includes(location.toLowerCase()));
    }
    if (ratingFilter !== null) result = result.filter((provider) => providerRating(provider) >= ratingFilter);
    if (availableOnly) result = result.filter(isAvailableToday);

    switch (sortBy) {
      case "Lowest Price":
        result.sort((a, b) => providerPrice(a) - providerPrice(b));
        break;
      case "Most Reviewed":
        result.sort((a, b) => providerReviews(b) - providerReviews(a));
        break;
      case "Name A–Z":
        result.sort((a, b) => providerName(a).localeCompare(providerName(b)));
        break;
      default:
        result.sort((a, b) => providerRating(b) - providerRating(a));
    }
    return result;
  }, [professionals, searchTerm, selectedCategories, location, ratingFilter, availableOnly, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProfessionals.length / pageSize));
  const visibleProfessionals = filteredProfessionals.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategories, location, ratingFilter, availableOnly, sortBy]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  };

  const toggleFavorite = (provider: Provider) => {
    const id = providerId(provider);
    if (!id) return;
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      localStorage.setItem("credence_favorite_providers", JSON.stringify(next));
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setLocation("All Locations");
    setRatingFilter(null);
    setAvailableOnly(false);
    setSearchInput("");
    setSearchTerm("");
  };

  const openProfile = (provider: Provider) => {
    const id = providerId(provider);
    if (id) navigate(`/professional/${id}`);
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchTerm(searchInput);
  };

  const countForCategory = (category: string) => {
    const matching = professionals.filter((provider) => providerCategory(provider).toLowerCase() === category.toLowerCase());
    return matching.length || CATEGORIES.find((item) => item.name === category)?.count || 0;
  };

  const countForRating = (rating: number) =>
    professionals.filter((provider) => providerRating(provider) >= rating).length;

  const countAvailableToday = professionals.filter(isAvailableToday).length;

  return (
    <main className="min-h-screen bg-[#f6f7f5] pb-10 text-slate-900">
      {/* Page banner */}
      <section className="relative mx-auto flex min-h-[140px] max-w-[1600px] items-center justify-between overflow-hidden rounded-b-xl border-b border-[#e5e9e5] bg-[#edf2ee] px-6 py-7 sm:px-10 lg:px-[4.5%]">
        <img
          src="/hero-background.png"
          alt=""
          aria-hidden="true"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-full object-cover object-right opacity-35 sm:w-3/4"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#edf2ee] via-[#edf2ee]/90 to-transparent" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight text-[#173b2d] sm:text-4xl">
            All <span className="text-[#086342]">Professionals</span>
          </h1>
          <p className="mt-1 text-sm text-slate-800 sm:text-base">
            Discover trusted and verified service professionals near you.
          </p>
        </div>

        <div className="relative z-10 hidden items-center gap-3 rounded-lg border border-white bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur sm:flex">
          <ShieldCheck size={34} className="fill-emerald-700 text-white" />
          <div>
            <p className="text-sm font-bold">Verified Professionals</p>
            <p className="text-xs text-slate-600">Skilled · Rated · Trusted</p>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-5 grid max-w-[1600px] grid-cols-1 gap-5 px-4 sm:px-6 lg:grid-cols-[285px_minmax(0,1fr)] lg:px-8">
        {/* Filter sidebar */}
        <aside className="h-fit rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <SlidersHorizontal size={21} /> Filter
            </h2>
            <button type="button" onClick={clearFilters} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
              Clear All
            </button>
          </div>

          {/* Service category */}
          <div className="border-b border-slate-100 py-4">
            <h3 className="mb-3 font-bold">Service Category</h3>
            <label className="mb-2 flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={selectedCategories.length === 0}
                onChange={() => setSelectedCategories([])}
                className="h-5 w-5 accent-emerald-700"
              />
              <span>All Categories</span>
            </label>
            {CATEGORIES.map((category) => (
              <label key={category.name} className="mb-2 flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.name)}
                  onChange={() => toggleCategory(category.name)}
                  className="h-5 w-5 accent-emerald-700"
                />
                <span>
                  {category.name} <span className="text-slate-500">({countForCategory(category.name)})</span>
                </span>
              </label>
            ))}
          </div>

          {/* Location */}
          <div className="border-b border-slate-100 py-4">
            <h3 className="mb-3 flex items-center gap-2 font-bold">
              <MapPin size={19} /> Location
            </h3>
            <div className="relative">
              <select
                aria-label="Location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                {LOCATIONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          {/* Rating */}
          <div className="border-b border-slate-100 py-4">
            <h3 className="mb-3 flex items-center gap-2 font-bold">
              <Star size={20} /> Rating
            </h3>
            {[4.5, 4, 3.5].map((rating) => (
              <label key={rating} className="mb-2 flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={ratingFilter === rating}
                  onChange={() => setRatingFilter(ratingFilter === rating ? null : rating)}
                  className="h-5 w-5 accent-emerald-700"
                />
                <span>
                  {rating.toFixed(1)} &amp; above <span className="text-slate-500">({countForRating(rating)})</span>
                </span>
              </label>
            ))}
          </div>

          {/* Availability */}
          <div className="pt-4">
            <h3 className="mb-3 flex items-center gap-2 font-bold">
              <CalendarDays size={20} /> Availability
            </h3>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(event) => setAvailableOnly(event.target.checked)}
                className="h-5 w-5 accent-emerald-700"
              />
              <span>
                Available Today <span className="text-slate-500">({countAvailableToday})</span>
              </span>
            </label>
          </div>
        </aside>

        {/* Results */}
        <section className="min-w-0">
          {/* Search */}
          <form onSubmit={submitSearch} className="mb-4 flex gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
              <Search className="shrink-0 text-slate-500" size={22} />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search professionals or services..."
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
              {searchInput && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchInput("");
                    setSearchTerm("");
                  }}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <button type="submit" className="rounded-xl bg-[#075b3d] px-7 text-sm font-bold text-white shadow-sm transition hover:bg-[#064a33]">
              Search
            </button>
          </form>

          {/* Count, sort, view */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-base">
              <strong className="text-xl">{filteredProfessionals.length}</strong> Professionals Found
            </p>
            <div className="flex items-center gap-3">
              <label htmlFor="sort-by" className="hidden text-sm sm:block">
                Sort by:
              </label>
              <div className="relative">
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-3 pr-9 text-sm outline-none focus:border-emerald-600"
                >
                  <option>Highest Rated</option>
                  <option>Most Reviewed</option>
                  <option>Lowest Price</option>
                  <option>Name A–Z</option>
                </select>
                <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
              <div className="flex gap-2">
                <button
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                    view === "grid" ? "border-[#075b3d] bg-[#075b3d] text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Grid2X2 size={19} />
                </button>
                <button
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                    view === "list" ? "border-[#075b3d] bg-[#075b3d] text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <List size={19} />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-slate-200 bg-white">
              <div className="text-center">
                <Loader2 className="mx-auto animate-spin text-emerald-700" size={32} />
                <p className="mt-3 text-sm text-slate-500">Loading professionals...</p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-100 bg-white p-8 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white">
                Try again
              </button>
            </div>
          ) : visibleProfessionals.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-16 text-center">
              <BriefcaseBusiness className="mx-auto text-slate-300" size={42} />
              <h3 className="mt-3 text-lg font-bold">No professionals found</h3>
              <p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p>
              <button onClick={clearFilters} className="mt-4 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white">
                Clear filters
              </button>
            </div>
          ) : (
            <div className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" : "flex flex-col gap-4"}>
              {visibleProfessionals.map((provider) => {
                const id = providerId(provider);
                const name = providerName(provider);
                const rating = providerRating(provider);
                const available = isAvailableToday(provider);
                const verified = isVerified(provider);
                const image = providerImage(provider);
                const isFav = favorites.includes(id);
               

                return (
                  <article
                    key={id || name}
                    className={`group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-colors duration-200 hover:border-emerald-300 hover:shadow-md ${
                      view === "list" ? "flex flex-col sm:flex-row" : ""
                    }`}
                  >
                    {/* Photo */}
                    <div className={`relative overflow-hidden bg-[#eef2ef] ${view === "list" ? "h-52 sm:h-auto sm:w-64 sm:shrink-0" : "h-[190px]"}`}>
                      {image ? (
                        <img
                          src={image}
                          alt={name}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                          className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#e8eeea]">
                          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-2xl font-bold text-emerald-800 shadow">
                            {getInitials(name)}
                          </span>
                        </div>
                      )}

                      <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-emerald-50/95 px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-sm">
                        <ShieldCheck size={14} className="fill-emerald-700 text-white" />
                        {verified ? "Verified" : "Professional"}
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleFavorite(provider)}
                        aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                        aria-pressed={isFav}
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-sm transition hover:scale-110"
                      >
                        <Heart size={18} className={isFav ? "fill-rose-500 text-rose-500" : ""} />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="flex min-w-0 flex-1 flex-col p-3.5">
                      <h3 className="truncate text-[15px] font-bold tracking-tight">{name}</h3>

                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
                          <Star size={15} className="shrink-0 fill-amber-400 text-amber-400" />
                          <strong className="text-slate-900">{rating ? rating.toFixed(1) : "New"}</strong>
                          <span className="truncate">({providerReviews(provider)} reviews)</span>
                        </div>
                        <span className="max-w-[45%] shrink-0 truncate rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                          {providerCategory(provider)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                        <span className="flex min-w-0 items-center gap-1.5 text-slate-700">
                          <MapPin size={14} className="shrink-0 fill-slate-700 text-white" />
                          <span className="truncate">{providerLocation(provider)}</span>
                        </span>
                        
                      </div>

                      {providerPrice(provider) > 0 && (
                        <p className="mt-2 text-xs text-slate-500">
                          Starting at <strong className="text-slate-900">₹{providerPrice(provider).toLocaleString("en-IN")}</strong>
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => openProfile(provider)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#075b3d] py-2 text-xs font-bold text-white transition hover:bg-[#06472f] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                      >
                        View Profile <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && filteredProfessionals.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                Showing {(page - 1) * pageSize + 1} – {Math.min(page * pageSize, filteredProfessionals.length)} of {filteredProfessionals.length} professionals
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  aria-label="Previous page"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={19} />
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .filter((number) => number === 1 || number === totalPages || Math.abs(number - page) <= 1)
                  .map((number, index, array) => (
                    <span key={number} className="contents">
                      {index > 0 && number - array[index - 1] > 1 && <span className="px-1 text-slate-500">…</span>}
                      <button
                        onClick={() => setPage(number)}
                        className={`h-9 min-w-9 rounded-xl border px-3 text-sm font-medium ${
                          page === number ? "border-emerald-800 bg-[#075b3d] text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {number}
                      </button>
                    </span>
                  ))}
                <button
                  aria-label="Next page"
                  disabled={page === totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={19} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}