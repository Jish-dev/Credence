import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Star,
  CalendarDays,
  ShieldCheck,
  BadgeCheck,
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
  latitude?: number;
  longitude?: number;
  coordinates?: [number, number]; // GeoJSON order: longitude, latitude
  geoLocation?: { coordinates?: [number, number] };
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
  { name: "Plumbing" },
  { name: "Electrical" },
  { name: "AC Service" },
  { name: "Home Cleaning" },
  { name: "Carpentry" },
  { name: "Painting" },
  { name: "Appliance Repair" },
  { name: "Vehicle Repair" },
];

// Homepage category labels and provider database labels can differ.
const CATEGORY_ALIASES: Record<string, string[]> = {
  Plumbing: ["plumbing", "plumber"],
  Electrical: ["electrical", "electrical services", "electrical works", "electrician"],
  "AC Service": ["ac service", "ac repair", "ac installation & repair", "air conditioning", "hvac"],
  "Home Cleaning": ["home cleaning", "cleaning", "house cleaning"],
  Carpentry: ["carpentry", "carpenter"],
  Painting: ["painting", "painter"],
  "Appliance Repair": ["appliance repair", "appliances", "washing machine repair", "refrigerator repair"],
  "Vehicle Repair": ["vehicle repair", "vehicle support", "car repair", "bike repair", "automotive", "roadside assistance"],
};

const normalize = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, " ").trim();

function canonicalCategory(value: string): string {
  const normalized = normalize(value);
  const entry = Object.entries(CATEGORY_ALIASES).find(([name, aliases]) =>
    normalize(name) === normalized || aliases.some((alias) => normalize(alias) === normalized)
  );
  return entry?.[0] ?? value.trim();
}

function providerMatchesCategory(provider: Provider, selected: string): boolean {
  const aliases = CATEGORY_ALIASES[canonicalCategory(selected)] || [selected];
  const terms = aliases.map(normalize);
  const providerCategories = [provider.category, ...(provider.categories || [])]
    .filter((item): item is string => Boolean(item))
    .map(normalize);
  return providerCategories.some((category) =>
    terms.some((term) => category === term || category.includes(term) || term.includes(category))
  );
}

type LocationResult = { place_id?: number; display_name: string; lat: string; lon: string; address?: { city?: string; county?: string; state?: string; country?: string } };
const validCoordinate = (lat: number, lon: number) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

type Coordinates = { latitude: number; longitude: number };
function providerCoordinates(provider: Provider): Coordinates | null {
  const pair = provider.geoLocation?.coordinates ?? provider.coordinates;
  const latitude = Number(provider.latitude ?? pair?.[1]);
  const longitude = Number(provider.longitude ?? pair?.[0]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}
function distanceKm(a: Coordinates, b: Coordinates): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCategory = searchParams.get("category") || "";
  const urlSearch = searchParams.get("search") || searchParams.get("q") || "";
  const urlLocation = searchParams.get("location") || "";
  const urlLat = searchParams.get("lat") || "";
  const urlLon = searchParams.get("lon") || "";
  const [professionals, setProfessionals] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => urlCategory ? [canonicalCategory(urlCategory)] : []);
  const [location, setLocation] = useState(urlLocation || "All Locations");
  const [customerCoordinates, setCustomerCoordinates] = useState<Coordinates | null>(() => {
    const lat = Number(urlLat), lon = Number(urlLon);
    return urlLat && urlLon && validCoordinate(lat, lon) ? { latitude: lat, longitude: lon } : null;
  });
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationSelected, setLocationSelected] = useState(Boolean(urlLat && urlLon));
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
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

  // Keep filters in sync with homepage navigation and browser Back/Forward.
  useEffect(() => {
    setSelectedCategories(urlCategory ? [canonicalCategory(urlCategory)] : []);
    setSearchInput(urlSearch);
    setSearchTerm(urlSearch);
    setLocation(urlLocation || "All Locations");
    const lat = Number(urlLat), lon = Number(urlLon);
    const coords = urlLat && urlLon && validCoordinate(lat, lon) ? { latitude: lat, longitude: lon } : null;
    setCustomerCoordinates(coords);
    setLocationSelected(Boolean(coords));
    if (coords) setSortBy("Nearest First");
  }, [urlCategory, urlSearch, urlLocation, urlLat, urlLon]);

  const updateUrlFilters = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next);
  };

  // Same Photon/OpenStreetMap autocomplete used by CREDENCE Home.tsx.
  useEffect(() => {
    if (locationSelected || location.trim().length < 2 || location === "All Locations") {
      setLocationResults([]);
      setLocationLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLocationLoading(true);
      try {
        const params = new URLSearchParams({ q: location.trim(), limit: "5", lang: "en" });
        const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Location search failed");
        const data = await response.json();
        const results: LocationResult[] = (data.features || [])
          .filter((feature: any) => !feature.properties?.country || String(feature.properties.country).toLowerCase() === "india")
          .map((feature: any) => {
            const props = feature.properties || {};
            const coords = feature.geometry?.coordinates || [];
            const city = props.city || props.town || props.village || props.county;
            const display_name = [props.name, city !== props.name ? city : undefined, props.state, props.country]
              .filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(", ");
            return { place_id: props.osm_id, display_name, lat: String(coords[1] ?? ""), lon: String(coords[0] ?? ""), address: { city, county: props.county, state: props.state, country: props.country } };
          })
          .filter((item: LocationResult) => item.display_name && item.lat && item.lon);
        if (!controller.signal.aborted) { setLocationResults(results); setLocationError(results.length ? "" : "No matching locations found."); }
      } catch (err) {
        if (!controller.signal.aborted) { setLocationResults([]); setLocationError("Unable to search locations right now."); }
      } finally { if (!controller.signal.aborted) setLocationLoading(false); }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [location, locationSelected]);

  const selectLocation = (result: LocationResult) => {
    const latitude = Number(result.lat), longitude = Number(result.lon);
    if (!validCoordinate(latitude, longitude)) return;
    setLocation(result.display_name);
    setCustomerCoordinates({ latitude, longitude });
    setLocationSelected(true);
    setLocationResults([]);
    setLocationError("");
    setSortBy("Nearest First");
    updateUrlFilters({ location: result.display_name, lat: String(latitude), lon: String(longitude) });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location services.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCustomerCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
        setLocation("All Locations");
        setLocationSelected(true);
        updateUrlFilters({ location: null, lat: String(coords.latitude), lon: String(coords.longitude) });
        setSortBy("Nearest First");
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setLocationError(error.code === 1 ? "Location permission denied. Enable location access in your browser." : "Could not determine your location. Try again or select a city.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

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
        return selectedCategories.some((selected) => providerMatchesCategory(provider, selected));
      });
    }

    if (location !== "All Locations" && !customerCoordinates) {
      const parts = location.toLowerCase().split(",").map((part) => part.trim()).filter((part) => part.length > 2 && part !== "india" && part !== "kerala");
      result = result.filter((provider) => parts.some((part) => providerLocation(provider).toLowerCase().includes(part)));
    }
    if (ratingFilter !== null) result = result.filter((provider) => providerRating(provider) >= ratingFilter);
    if (availableOnly) result = result.filter(isAvailableToday);

    if (sortBy === "Nearest First" && customerCoordinates) {
      result.sort((a, b) => {
        const aCoords = providerCoordinates(a);
        const bCoords = providerCoordinates(b);
        return (aCoords ? distanceKm(customerCoordinates, aCoords) : Infinity) -
          (bCoords ? distanceKm(customerCoordinates, bCoords) : Infinity);
      });
      return result;
    }

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
  }, [professionals, searchTerm, selectedCategories, location, ratingFilter, availableOnly, sortBy, customerCoordinates]);

  const totalPages = Math.max(1, Math.ceil(filteredProfessionals.length / pageSize));
  const visibleProfessionals = filteredProfessionals.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategories, location, ratingFilter, availableOnly, sortBy]);

  const toggleCategory = (category: string) => {
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter((item) => item !== category)
      : [...selectedCategories, category];
    setSelectedCategories(next);
    updateUrlFilters({ category: next.length === 1 ? next[0] : null });
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
    setCustomerCoordinates(null);
    setLocationError("");
    setRatingFilter(null);
    setAvailableOnly(false);
    setSearchInput("");
    setSearchTerm("");
    updateUrlFilters({ category: null, location: null, lat: null, lon: null, search: null, q: null });
  };

  const openProfile = (provider: Provider) => {
    const id = providerId(provider);
    if (id) navigate(`/professional/${id}`);
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchTerm(searchInput);
    updateUrlFilters({ search: searchInput.trim() || null, q: null });
  };

  const countForCategory = (category: string) => {
    return professionals.filter((provider) => providerMatchesCategory(provider, category)).length;
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
            {selectedCategories.length === 1 ? selectedCategories[0] : "All"} <span className="text-[#086342]">Professionals</span>
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
                onChange={() => {
                  setSelectedCategories([]);
                  updateUrlFilters({ category: null });
                }}
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
              <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                <MapPin size={17} className="shrink-0 text-emerald-700" />
                <input
                  type="text"
                  aria-label="Search location"
                  value={location === "All Locations" ? "" : location}
                  onChange={(event) => {
                    setLocation(event.target.value);
                    setLocationSelected(false);
                    setCustomerCoordinates(null);
                    setLocationError("");
                    if (sortBy === "Nearest First") setSortBy("Highest Rated");
                    updateUrlFilters({ location: event.target.value || null, lat: null, lon: null });
                  }}
                  placeholder="City, town or area..."
                  autoComplete="off"
                  className="min-w-0 w-full py-2.5 text-sm outline-none"
                />
                {locationLoading && <Loader2 size={16} className="animate-spin text-emerald-700" />}
              </div>
              {locationResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                  {locationResults.map((result, index) => (
                    <button type="button" key={`${result.place_id ?? index}-${result.lat}-${result.lon}`} onClick={() => selectLocation(result)}
                      className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-emerald-50">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-emerald-700" />
                      <span>{result.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={useMyLocation} disabled={locating} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 px-3 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50">
              {locating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
              {locating ? "Finding your location..." : customerCoordinates ? "Update My Location" : "Use My Location"}
            </button>
            {customerCoordinates && <p className="mt-2 text-xs text-emerald-800">GPS location active · nearest providers first when coordinates are available</p>}
            {locationError && <p role="alert" className="mt-2 text-xs text-rose-700">{locationError}</p>}
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
                    updateUrlFilters({ search: null, q: null });
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
                  {customerCoordinates && <option>Nearest First</option>}
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
                      <div className="flex min-w-0 items-center gap-1.5">
                        <h3 className="truncate text-[15px] font-bold tracking-tight">{name}</h3>
                        {verified && (
                          <BadgeCheck
                            size={19}
                            className="shrink-0 fill-emerald-700 text-white"
                            strokeWidth={2.5}
                            aria-label="Verified professional"
                          />
                        )}
                      </div>

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
                          {customerCoordinates && providerCoordinates(provider) && (
                            <span className="shrink-0 font-semibold text-emerald-800">· {distanceKm(customerCoordinates, providerCoordinates(provider)!).toFixed(1)} km</span>
                          )}
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