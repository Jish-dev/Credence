
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Grid2X2,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Phone,
  Plug,
  Share2,
  ShieldCheck,
  Star,
  Users,
  Wrench,
  Zap,
  Settings,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { api } from "../api";

// ========================================
// TYPES
// ========================================

interface Provider {
  _id: string;
  name: string;
  title?: string;
  category?: string;
  categories?: string[];
  providerType?: string;
  location?: string;
  city?: string;
  area?: string;
  address?: string;
  experienceYears?: number;
  bio?: string;
  description?: string;
  contact?: string;
  contactPhone?: string;
  email?: string;
  startingPrice?: number;
  profileImage?: string;
  verificationStatus?: string;
  averageRating?: number;
  reviewCount?: number;
  isAvailable?: boolean;
}

interface ReviewCustomer {
  _id: string;
  name: string;
  profileImage?: string;
}

interface Review {
  _id: string;
  customer: ReviewCustomer | string;
  provider: string;
  booking: string;
  rating: number;
  comment: string;
  status: "published" | "hidden";
  createdAt: string;
}

interface ReviewResponse {
  success: boolean;
  reviews: Review[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface ProviderResponse {
  provider?: Provider;
  data?: {
    provider?: Provider;
  };
}

type Tab = "overview" | "services" | "reviews";

// ========================================
// CONSTANTS
// ========================================

const serviceIcons = [Zap, Plug, Wrench, Settings];

const serviceDescriptions = [
  "Home & office wiring",
  "Fans, lights, switches",
  "Quick and reliable repair",
  "Periodic service and checkup",
];

const reviewLimit = 5;

// ========================================
// HELPERS
// ========================================

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const getCustomerName = (customer: ReviewCustomer | string) =>
  typeof customer === "string" ? "Customer" : customer?.name || "Customer";

const getCustomerImage = (customer: ReviewCustomer | string) =>
  typeof customer === "string" ? "" : customer?.profileImage || "";

// ========================================
// STAR DISPLAY
// ========================================

function StarRating({
  rating,
  size = 16,
}: {
  rating: number;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-gray-300"
          }
        />
      ))}
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function ProviderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [favorite, setFavorite] = useState(false);

  // Review state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPages, setReviewPages] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);

  // ========================================
  // LOAD PROVIDER
  // ========================================

  useEffect(() => {
    let mounted = true;

    const loadProvider = async () => {
      if (!id) {
        setError("Provider ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/providers/${id}`);
        const result = response.data;

        const data =
          result?.provider ??
          result?.data?.provider ??
          result?.data ??
          result;

        if (!data?._id) {
          throw new Error("Provider details not found.");
        }

        if (mounted) {
          setProvider(data);
        }
      } catch (err: any) {
        if (mounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Unable to load provider details."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProvider();

    return () => {
      mounted = false;
    };
  }, [id]);

  // ========================================
  // LOAD PROVIDER REVIEWS
  // ========================================

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    const loadReviews = async () => {
      try {
        setReviewsLoading(true);
        setReviewsError("");

        const response = await api.get<ReviewResponse>(
          `/reviews/provider/${id}`,
          {
            params: {
              page: reviewPage,
              limit: reviewLimit,
            },
          }
        );

        if (!mounted) return;

        const data = response.data;

        setReviews(data.reviews || []);
        setReviewTotal(data.pagination?.total || 0);
        setReviewPages(data.pagination?.pages || 1);
      } catch (err) {
        if (mounted) {
          setReviewsError(
            err instanceof Error
              ? err.message
              : "Unable to load customer reviews."
          );
        }
      } finally {
        if (mounted) {
          setReviewsLoading(false);
        }
      }
    };

    loadReviews();

    return () => {
      mounted = false;
    };
  }, [id, reviewPage]);

  // ========================================
  // PROVIDER DETAILS
  // ========================================

  const location =
    [provider?.area, provider?.city, provider?.location]
      .filter(Boolean)
      .filter(
        (value, index, values) => values.indexOf(value) === index
      )
      .join(", ") ||
    provider?.address ||
    "Location not available";

  const phone = provider?.contactPhone || provider?.contact;

  const services = provider?.categories?.length
    ? provider.categories
    : provider?.category
      ? [provider.category]
      : [];

  // ========================================
  // RATING DISTRIBUTION
  // ========================================

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((review) => review.rating === star).length,
  }));

  const averageRating =
    provider?.averageRating || 0;

  const totalReviews =
    provider?.reviewCount ?? reviewTotal;

  // ========================================
  // ACTIONS
  // ========================================

  const shareProfile = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: provider?.name || "CREDENCE Professional",
          text: `View ${provider?.name} on CREDENCE`,
          url: window.location.href,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // User cancelled sharing.
    }
  };

  const messageProvider = () => {
    if (phone) {
      window.location.href = `sms:${phone}`;
    } else if (provider?.email) {
      window.location.href = `mailto:${provider.email}`;
    }
  };

  const bookNow = () => {
    if (provider?._id) {
      navigate(`/booking?providerId=${provider._id}`);
    }
  };

  // ========================================
  // LOADING STATE
  // ========================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#fbf9f6]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
          <p className="mt-3 text-sm text-slate-500">
            Loading professional...
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // ERROR STATE
  // ========================================

  if (error || !provider) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#fbf9f6] px-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Provider not found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error || "This provider is unavailable."}
          </p>

          <button
            onClick={() => navigate(-1)}
            className="mt-5 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const rating = averageRating
    ? averageRating.toFixed(1)
    : "New";

  const experience =
    provider.experienceYears != null
      ? `${provider.experienceYears}+ Years`
      : "Experience not listed";

  // ========================================
  // UI
  // ========================================

  return (
    <main className="min-h-screen bg-[#fbf9f6] px-4 pb-12 pt-5 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">

        {/* PROVIDER HERO */}

        <section className="relative isolate min-h-[270px] overflow-hidden rounded-[26px] bg-[#004b34] text-white shadow-sm sm:min-h-[285px]">
          <div className="absolute inset-0 -z-20 bg-gradient-to-r from-[#00533a] via-[#00442f] to-[#062c24]" />

          <div className="absolute inset-0 -z-10 opacity-35">
            <img
              src="/images/electrician-banner.jpg"
              alt=""
              className="h-full w-full object-cover object-center"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>

          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#004b34] via-[#004b34]/90 to-[#004b34]/15" />

          <button
            onClick={() => navigate(-1)}
            className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-2 text-xs font-semibold text-white/90 backdrop-blur-sm hover:bg-black/25 sm:left-7"
          >
            <ArrowLeft size={16} />
            Back to Results
          </button>

          <div className="absolute right-5 top-5 flex gap-2 sm:right-7">
            <button
              onClick={shareProfile}
              aria-label="Share profile"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-800 shadow-md hover:bg-slate-100"
            >
              <Share2 size={20} />
            </button>

            <button
              onClick={() => setFavorite((value) => !value)}
              aria-label="Save provider"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-red-500 shadow-md hover:bg-red-50"
            >
              <Heart
                size={22}
                fill={favorite ? "currentColor" : "none"}
              />
            </button>
          </div>

          <div className="flex min-h-[270px] flex-col items-center gap-5 px-5 pb-6 pt-20 sm:min-h-[285px] sm:flex-row sm:items-end sm:gap-8 sm:px-14 sm:pb-0 sm:pt-12">
            <div className="h-40 w-40 shrink-0 overflow-hidden rounded-[25px] border-[4px] border-white bg-emerald-100 shadow-xl sm:h-52 sm:w-52 sm:translate-y-1">
              {provider.profileImage ? (
                <img
                  src={provider.profileImage}
                  alt={provider.name}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-5xl font-bold text-emerald-800">
                  {provider.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pb-7 text-center sm:pb-11 sm:text-left">
              {provider.verificationStatus === "verified" && (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#dff8e8] px-3 py-1.5 text-xs font-bold text-[#006b3f]">
                  <ShieldCheck size={15} />
                  Verified Provider
                </span>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-[34px]">
                  {provider.name}
                </h1>

                {provider.verificationStatus === "verified" && (
                  <BadgeCheck
                    size={27}
                    fill="white"
                    className="text-emerald-700"
                  />
                )}
              </div>

              <p className="mt-1 text-sm font-medium text-white/90 sm:text-base">
                {provider.title || provider.category || "Professional Services"}
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm font-medium text-white sm:justify-start">
                <span className="inline-flex items-center gap-2">
                  <Star
                    size={20}
                    fill="#fbbf24"
                    className="text-amber-400"
                  />
                  <strong className="text-base">{rating}</strong>
                  <span className="text-white/85">
                    ({totalReviews} Reviews)
                  </span>
                </span>

                <span className="hidden h-5 w-px bg-white/40 sm:block" />

                <span className="inline-flex items-center gap-2">
                  <BriefcaseBusiness size={20} />
                  {experience}
                </span>

                <span className="hidden h-5 w-px bg-white/40 sm:block" />

                <span className="inline-flex items-center gap-2">
                  <MapPin size={20} />
                  {location}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* TABS */}

        <div className="mt-7 flex flex-wrap gap-3">
          {([
            { id: "overview", label: "Overview", Icon: Home },
            { id: "services", label: "Services", Icon: Grid2X2 },
            { id: "reviews", label: "Reviews", Icon: Star },
          ] as const).map(({ id: tab, label, Icon }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`inline-flex min-w-[150px] items-center justify-center gap-2.5 rounded-2xl border px-6 py-3 text-sm font-semibold shadow-sm transition sm:min-w-[190px] sm:text-base ${
                activeTab === tab
                  ? "border-emerald-800 bg-emerald-800 text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              <Icon size={21} />
              {label}
            </button>
          ))}
        </div>

        {/* MAIN CONTENT */}

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(310px,0.46fr)]">
          <div className="space-y-5">

            {/* OVERVIEW TAB */}

            {activeTab === "overview" && (
              <>
                <section className="relative overflow-hidden rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,0.045)] sm:p-7">
                  <div className="pointer-events-none absolute -right-5 -top-5 text-emerald-100">
                    <Zap size={145} strokeWidth={0.8} />
                  </div>

                  <div className="relative">
                    <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                      About {provider.name}
                    </h2>

                    <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700 sm:text-[15px] sm:leading-7">
                      {provider.description ||
                        provider.bio ||
                        "Professional service provider offering reliable and quality services. Contact the provider to learn more."}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4 sm:gap-3">
                      <div className="flex flex-col items-center text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
                          <ShieldCheck size={26} />
                        </span>

                        <strong className="mt-2 text-sm">
                          {provider.verificationStatus === "verified"
                            ? "Verified"
                            : "Listed"}
                        </strong>

                        <span className="text-xs text-slate-500">
                          Provider
                        </span>
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
                          <BadgeCheck size={26} />
                        </span>

                        <strong className="mt-2 text-sm">
                          {provider.experienceYears != null
                            ? `${provider.experienceYears}+ Years`
                            : "N/A"}
                        </strong>

                        <span className="text-xs text-slate-500">
                          Experience
                        </span>
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
                          <Users size={26} />
                        </span>

                        <strong className="mt-2 text-sm">
                          {totalReviews}
                        </strong>

                        <span className="text-xs text-slate-500">
                          Reviews
                        </span>
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
                          <Star size={26} />
                        </span>

                        <strong className="mt-2 text-sm">{rating}</strong>

                        <span className="text-xs text-slate-500">
                          Average Rating
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,0.04)] sm:p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                      Services Offered
                    </h2>

                    <button
                      onClick={() => setActiveTab("services")}
                      className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950"
                    >
                      View All <span aria-hidden="true">→</span>
                    </button>
                  </div>

                  {services.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {services.slice(0, 4).map((service, index) => {
                        const ServiceIcon =
                          serviceIcons[index % serviceIcons.length];

                        return (
                          <div
                            key={`${service}-${index}`}
                            className="min-h-[132px] rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_3px_10px_rgba(15,23,42,0.045)]"
                          >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
                              <ServiceIcon
                                size={25}
                                fill={
                                  service === "Electrical Wiring"
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </span>

                            <h3 className="mt-3 text-sm font-extrabold text-slate-950">
                              {service}
                            </h3>

                            <p className="mt-1 text-xs leading-5 text-slate-600">
                              {serviceDescriptions[index % serviceDescriptions.length]}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No services have been added yet.
                    </p>
                  )}
                </section>
              </>
            )}

            {/* SERVICES TAB */}

            {activeTab === "services" && (
              <section className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-extrabold sm:text-2xl">
                  Services Offered
                </h2>

                {services.length ? (
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {services.map((service, index) => {
                      const ServiceIcon =
                        serviceIcons[index % serviceIcons.length];

                      return (
                        <div
                          key={`${service}-${index}`}
                          className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
                            <ServiceIcon size={24} />
                          </span>

                          <span className="text-sm font-bold">
                            {service}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    No services listed.
                  </p>
                )}
              </section>
            )}

            {/* REVIEWS TAB */}

            {activeTab === "reviews" && (
              <>
                {/* REVIEW SUMMARY */}

                <section className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
                  <h2 className="text-xl font-extrabold sm:text-2xl">
                    Customer Reviews
                  </h2>

                  <div className="mt-6 grid gap-7 sm:grid-cols-[180px_1fr]">
                    {/* Average rating */}

                    <div className="flex flex-col items-center justify-center rounded-2xl bg-[#f5f8f5] p-5 text-center">
                      <p className="text-5xl font-extrabold text-[#153d32]">
                        {rating}
                      </p>

                      <div className="mt-3">
                        <StarRating rating={averageRating} size={19} />
                      </div>

                      <p className="mt-3 text-xs text-slate-500">
                        Based on {totalReviews} reviews
                      </p>
                    </div>

                    {/* Rating distribution */}

                    <div className="flex flex-col justify-center gap-3">
                      {ratingCounts.map(({ star, count }) => {
                        const percentage =
                          reviews.length > 0
                            ? (count / reviewTotal) * 100
                            : 0;

                        return (
                          <div
                            key={star}
                            className="flex items-center gap-3"
                          >
                            <span className="flex w-8 items-center gap-1 text-sm font-semibold text-slate-600">
                              {star}
                              <Star
                                size={13}
                                fill="#fbbf24"
                                className="text-amber-400"
                              />
                            </span>

                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-amber-400 transition-all"
                                style={{
                                  width: `${Math.min(100, percentage)}%`,
                                }}
                              />
                            </div>

                            <span className="w-7 text-right text-xs text-slate-500">
                              {count}
                            </span>
                          </div>
                        );
                      })}

                      <p className="mt-1 text-xs text-slate-400">
                        Distribution calculated from the reviews loaded on this page.
                      </p>
                    </div>
                  </div>
                </section>

                {/* REVIEW LIST */}

                <section className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        Customer feedback
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        {reviewTotal} published reviews
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setReviewPage(1);
                      }}
                      disabled={reviewsLoading}
                      aria-label="Refresh reviews"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw
                        size={17}
                        className={reviewsLoading ? "animate-spin" : ""}
                      />
                    </button>
                  </div>

                  {/* Loading */}

                  {reviewsLoading ? (
                    <div className="mt-6 space-y-4">
                      {[1, 2, 3].map((item) => (
                        <div
                          key={item}
                          className="animate-pulse rounded-2xl border border-slate-100 p-4"
                        >
                          <div className="h-4 w-1/3 rounded bg-slate-100" />
                          <div className="mt-3 h-3 w-1/4 rounded bg-slate-100" />
                          <div className="mt-4 h-3 w-full rounded bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  ) : reviewsError ? (
                    <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-5 text-center">
                      <p className="text-sm text-red-600">
                        {reviewsError}
                      </p>

                      <button
                        onClick={() => setReviewPage(1)}
                        className="mt-3 text-sm font-semibold text-red-700 underline"
                      >
                        Try again
                      </button>
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="mt-6 rounded-2xl bg-[#f7f9f7] px-5 py-12 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                        <MessageCircle size={26} />
                      </div>

                      <h3 className="mt-4 text-base font-bold text-slate-900">
                        No reviews yet
                      </h3>

                      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                        Customer reviews will appear here after customers complete their bookings and share their experiences.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 divide-y divide-slate-100">
                      {reviews.map((review) => {
                        const customerName = getCustomerName(review.customer);
                        const customerImage = getCustomerImage(review.customer);

                        return (
                          <article
                            key={review._id}
                            className="py-5 first:pt-0 last:pb-0"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-sm font-bold text-emerald-800">
                                  {customerImage ? (
                                    <img
                                      src={customerImage}
                                      alt={customerName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    customerName.charAt(0).toUpperCase()
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <h3 className="truncate text-sm font-bold text-slate-900">
                                    {customerName}
                                  </h3>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {formatDate(review.createdAt)}
                                  </p>
                                </div>
                              </div>

                              <div className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                                  <Star
                                    size={13}
                                    fill="currentColor"
                                  />
                                  {review.rating}.0
                                </span>
                              </div>
                            </div>

                            <div className="mt-3">
                              <StarRating rating={review.rating} />
                            </div>

                            {review.comment ? (
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                {review.comment}
                              </p>
                            ) : (
                              <p className="mt-3 text-sm italic text-slate-400">
                                No written comment.
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {/* PAGINATION */}

                  {!reviewsLoading &&
                    reviews.length > 0 &&
                    reviewPages > 1 && (
                      <div className="mt-7 flex items-center justify-center gap-4 border-t border-slate-100 pt-5">
                        <button
                          disabled={reviewPage <= 1}
                          onClick={() =>
                            setReviewPage((current) => current - 1)
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          aria-label="Previous reviews"
                        >
                          <ChevronLeft size={19} />
                        </button>

                        <span className="text-sm font-medium text-slate-500">
                          Page {reviewPage} of {reviewPages}
                        </span>

                        <button
                          disabled={reviewPage >= reviewPages}
                          onClick={() =>
                            setReviewPage((current) => current + 1)
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          aria-label="Next reviews"
                        >
                          <ChevronRight size={19} />
                        </button>
                      </div>
                    )}
                </section>
              </>
            )}
          </div>

          {/* BOOKING PANEL */}

          <aside className="overflow-hidden rounded-[24px] border border-emerald-100 bg-[#e9f6ed] p-3 shadow-sm lg:sticky lg:top-20">
            <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#00633f] to-[#003e2d] px-5 py-7 text-white sm:px-7">
              <Zap
                className="absolute -right-1 top-5 text-white/10"
                size={115}
                strokeWidth={0.8}
              />

              <p className="relative text-base font-semibold text-white/90">
                Service Starting From
              </p>

              <p className="relative mt-2 text-4xl font-extrabold tracking-tight sm:text-[46px]">
                {provider.startingPrice != null
                  ? `₹${provider.startingPrice.toLocaleString("en-IN")}`
                  : "Contact Us"}
              </p>

              <button
                onClick={bookNow}
                className="relative mt-6 flex min-h-[54px] w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3 text-base font-extrabold text-emerald-800 shadow-sm hover:bg-emerald-50"
              >
                <CalendarDays size={22} />
                Book Now
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-2 pt-4">
              <button
                onClick={messageProvider}
                disabled={!phone && !provider.email}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white px-3 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageCircle size={20} />
                Message
              </button>

              <a
                href={phone ? `tel:${phone}` : undefined}
                aria-disabled={!phone}
                onClick={(event) => {
                  if (!phone) event.preventDefault();
                }}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white px-3 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-50 ${
                  !phone ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <Phone size={19} />
                Call
              </a>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
