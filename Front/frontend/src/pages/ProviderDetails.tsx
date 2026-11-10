import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Star } from "lucide-react";
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

type Tab = "overview" | "services" | "reviews";

// ========================================
// CONSTANTS & HELPERS
// ========================================

const reviewLimit = 5;
const easeOut = [0.22, 1, 0.36, 1] as const;

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

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          aria-hidden="true"
          className={
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-slate-300"
          }
        />
      ))}
    </div>
  );
}

function ServiceList({ services }: { services: string[] }) {
  return (
    <ul className="divide-y divide-slate-200 border-y border-slate-200">
      {services.map((service, index) => (
        <motion.li
          key={`${service}-${index}`}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: index * 0.06, ease: easeOut }}
          className="py-4 text-base font-medium text-slate-900"
        >
          {service}
        </motion.li>
      ))}
    </ul>
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
  const [copied, setCopied] = useState(false);

  // Review state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPages, setReviewPages] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewRefresh, setReviewRefresh] = useState(0);

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
          result?.provider ?? result?.data?.provider ?? result?.data ?? result;

        if (!data?._id) {
          throw new Error("Provider details not found.");
        }

        if (mounted) setProvider(data);
      } catch (err: any) {
        if (mounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Unable to load provider details."
          );
        }
      } finally {
        if (mounted) setLoading(false);
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
          { params: { page: reviewPage, limit: reviewLimit } }
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
        if (mounted) setReviewsLoading(false);
      }
    };

    loadReviews();

    return () => {
      mounted = false;
    };
  }, [id, reviewPage, reviewRefresh]);

  const refreshReviews = () => {
    setReviewPage(1);
    setReviewRefresh((value) => value + 1);
  };

  // ========================================
  // DERIVED DATA
  // ========================================

  const location =
    [provider?.area, provider?.city, provider?.location]
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(", ") ||
    provider?.address ||
    "Location not available";

  const phone = provider?.contactPhone || provider?.contact;

  const services = provider?.categories?.length
    ? provider.categories
    : provider?.category
      ? [provider.category]
      : [];

  // Distribution is based on the reviews loaded for the current page.
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((review) => review.rating === star).length,
  }));

  const averageRating = provider?.averageRating || 0;
  const totalReviews = provider?.reviewCount ?? reviewTotal;

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
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
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
    if (provider?._id) navigate(`/booking?providerId=${provider._id}`);
  };

  // ========================================
  // LOADING STATE
  // ========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-4 pt-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="grid gap-8 md:grid-cols-[13rem_1fr]">
            <div className="aspect-square w-40 rounded-xl bg-slate-100 md:w-full" />
            <div className="space-y-4 pt-2">
              <div className="h-9 w-2/3 rounded bg-slate-100" />
              <div className="h-4 w-1/3 rounded bg-slate-100" />
              <div className="h-4 w-1/2 rounded bg-slate-100" />
            </div>
          </div>
          <div className="mt-12 h-48 rounded-xl bg-slate-100" />
        </div>
      </main>
    );
  }

  // ========================================
  // ERROR STATE
  // ========================================

  if (error || !provider) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-white px-5">
        <div className="max-w-md rounded-xl border border-slate-200 p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-900">
            We couldn't find this professional
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {error || "This profile is unavailable."}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
          >
            Go back
          </button>
        </div>
      </main>
    );
  }

  const rating = averageRating ? averageRating.toFixed(1) : "New";
  const verified = provider.verificationStatus === "verified";
  const experience =
    provider.experienceYears != null
      ? `${provider.experienceYears}+ years`
      : "Not listed";
  const price =
    provider.startingPrice != null
      ? `₹${provider.startingPrice.toLocaleString("en-IN")}`
      : null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "services", label: "Services" },
    { id: "reviews", label: `Reviews (${totalReviews})` },
  ];

  // ========================================
  // UI
  // ========================================

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen bg-white px-4 pb-28 pt-5 text-slate-900 selection:bg-emerald-100 sm:px-6 lg:px-8 lg:pb-16">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => navigate(-1)}
            className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-emerald-800 hover:decoration-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Back to results
          </button>

          {/* PROFILE HEADER */}

          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="mt-6 grid gap-8 border-b border-slate-200 pb-10 md:grid-cols-[13rem_1fr]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1, ease: easeOut }}
              className="relative aspect-square w-40 overflow-hidden rounded-xl bg-emerald-100 md:w-full"
            >
              <div className="flex h-full w-full items-center justify-center text-6xl font-semibold text-emerald-800/40">
                {provider.name.charAt(0).toUpperCase()}
              </div>
              {provider.profileImage && (
                <img
                  src={provider.profileImage}
                  alt={provider.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
            </motion.div>

            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {provider.name}
                  </h1>
                  <p className="mt-1 text-base text-slate-600">
                    {provider.title ||
                      provider.category ||
                      "Professional services"}
                  </p>
                  {verified && (
                    <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      Verified by Credence
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={shareProfile}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-emerald-700 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    {copied ? "Link copied" : "Share"}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setFavorite((value) => !value)}
                    aria-pressed={favorite}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                      favorite
                        ? "border-emerald-800 bg-emerald-800 text-white"
                        : "border-slate-300 text-slate-800 hover:border-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {favorite ? "Saved" : "Save"}
                  </motion.button>
                </div>
              </div>

              <dl className="mt-8 grid grid-cols-2 gap-x-10 gap-y-5 sm:grid-cols-[auto_auto_1fr] md:mt-auto md:pt-8">
                <div>
                  <dt className="text-sm text-slate-500">Rating</dt>
                  <dd className="mt-1 flex items-center gap-2 text-lg font-semibold">
                    <Star
                      size={17}
                      aria-hidden="true"
                      className="fill-amber-400 text-amber-400"
                    />
                    {rating}
                    <span className="text-sm font-normal text-slate-500">
                      ({totalReviews})
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Experience</dt>
                  <dd className="mt-1 text-lg font-semibold">{experience}</dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-sm text-slate-500">Location</dt>
                  <dd className="mt-1 text-lg font-semibold">{location}</dd>
                </div>
              </dl>
            </div>
          </motion.header>

          {/* TABS */}

          <div
            role="tablist"
            aria-label="Profile sections"
            className="mt-8 flex gap-8 overflow-x-auto border-b border-slate-200"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative shrink-0 py-3 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                  activeTab === tab.id
                    ? "text-emerald-800"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-emerald-700"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* MAIN CONTENT */}

          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  role="tabpanel"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: easeOut }}
                >
                  {/* OVERVIEW */}

                  {activeTab === "overview" && (
                    <div className="space-y-12">
                      <section>
                        <h2 className="text-2xl font-bold tracking-tight">
                          About {provider.name}
                        </h2>
                        <p className="mt-3 max-w-prose text-base leading-7 text-slate-700">
                          {provider.description ||
                            provider.bio ||
                            "This professional hasn't added a description yet. Contact them to learn more about their work."}
                        </p>

                        <dl className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
                          {[
                            ["Status", verified ? "Verified" : "Listed"],
                            ["Experience", experience],
                            ["Reviews", String(totalReviews)],
                            ["Average rating", rating],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="flex items-center justify-between py-3.5"
                            >
                              <dt className="text-sm text-slate-500">
                                {label}
                              </dt>
                              <dd className="text-base font-semibold">
                                {value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </section>

                      <section>
                        <div className="mb-4 flex items-end justify-between gap-3">
                          <h2 className="text-2xl font-bold tracking-tight">
                            Services offered
                          </h2>
                          {services.length > 4 && (
                            <button
                              onClick={() => setActiveTab("services")}
                              className="text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 transition hover:decoration-emerald-800"
                            >
                              View all services
                            </button>
                          )}
                        </div>

                        {services.length > 0 ? (
                          <ServiceList services={services.slice(0, 4)} />
                        ) : (
                          <p className="text-sm text-slate-500">
                            No services have been added yet.
                          </p>
                        )}
                      </section>
                    </div>
                  )}

                  {/* SERVICES */}

                  {activeTab === "services" && (
                    <section>
                      <h2 className="mb-4 text-2xl font-bold tracking-tight">
                        Services offered
                      </h2>
                      {services.length > 0 ? (
                        <ServiceList services={services} />
                      ) : (
                        <p className="text-sm text-slate-500">
                          No services listed.
                        </p>
                      )}
                    </section>
                  )}

                  {/* REVIEWS */}

                  {activeTab === "reviews" && (
                    <div className="space-y-10">
                      <section>
                        <h2 className="text-2xl font-bold tracking-tight">
                          Customer reviews
                        </h2>

                        <div className="mt-6 grid gap-8 sm:grid-cols-[11rem_1fr] sm:items-center">
                          <div>
                            <p className="text-6xl font-bold tracking-tight text-emerald-900">
                              {rating}
                            </p>
                            <div className="mt-3">
                              <StarRating rating={averageRating} size={18} />
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                              {totalReviews} reviews
                            </p>
                          </div>

                          <div className="space-y-2.5">
                            {ratingCounts.map(({ star, count }) => {
                              const percentage =
                                reviews.length > 0
                                  ? (count / reviews.length) * 100
                                  : 0;

                              return (
                                <div
                                  key={star}
                                  className="flex items-center gap-3"
                                >
                                  <span className="flex w-10 items-center gap-1 text-sm font-medium text-slate-600">
                                    {star}
                                    <Star
                                      size={12}
                                      aria-hidden="true"
                                      className="fill-amber-400 text-amber-400"
                                    />
                                  </span>
                                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{
                                        duration: 0.8,
                                        delay: (5 - star) * 0.08,
                                        ease: easeOut,
                                      }}
                                      className="h-full rounded-full bg-emerald-600"
                                    />
                                  </div>
                                  <span className="w-6 text-right text-sm text-slate-500">
                                    {count}
                                  </span>
                                </div>
                              );
                            })}
                            {reviewPages > 1 && (
                              <p className="pt-1 text-xs text-slate-400">
                                Based on the reviews shown on this page.
                              </p>
                            )}
                          </div>
                        </div>
                      </section>

                      <section>
                        <div className="flex items-end justify-between gap-3 border-b border-slate-200 pb-3">
                          <h3 className="text-lg font-semibold">
                            {reviewTotal} published{" "}
                            {reviewTotal === 1 ? "review" : "reviews"}
                          </h3>
                          <button
                            onClick={refreshReviews}
                            disabled={reviewsLoading}
                            className="text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 transition hover:decoration-emerald-800 disabled:opacity-50"
                          >
                            {reviewsLoading ? "Refreshing…" : "Refresh"}
                          </button>
                        </div>

                        {reviewsLoading ? (
                          <div className="mt-6 space-y-6">
                            {[1, 2, 3].map((item) => (
                              <div key={item} className="animate-pulse">
                                <div className="h-4 w-1/3 rounded bg-slate-100" />
                                <div className="mt-3 h-3 w-1/4 rounded bg-slate-100" />
                                <div className="mt-4 h-3 w-full rounded bg-slate-100" />
                              </div>
                            ))}
                          </div>
                        ) : reviewsError ? (
                          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                            {reviewsError}{" "}
                            <button
                              onClick={refreshReviews}
                              className="font-semibold underline"
                            >
                              Try again
                            </button>
                          </div>
                        ) : reviews.length === 0 ? (
                          <div className="py-14 text-center">
                            <h4 className="text-base font-semibold">
                              No reviews yet
                            </h4>
                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                              Reviews appear here after customers complete a
                              booking and share their experience.
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-200">
                            {reviews.map((review, index) => {
                              const customerName = getCustomerName(
                                review.customer
                              );
                              const customerImage = getCustomerImage(
                                review.customer
                              );

                              return (
                                <motion.article
                                  key={review._id}
                                  initial={{ opacity: 0, y: 14 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{
                                    duration: 0.45,
                                    delay: index * 0.07,
                                    ease: easeOut,
                                  }}
                                  className="py-6"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900">
                                        {customerImage ? (
                                          <img
                                            src={customerImage}
                                            alt=""
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          customerName.charAt(0).toUpperCase()
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="truncate text-sm font-semibold">
                                          {customerName}
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                          {formatDate(review.createdAt)}
                                        </p>
                                      </div>
                                    </div>
                                    <StarRating rating={review.rating} />
                                  </div>

                                  {review.comment ? (
                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                      {review.comment}
                                    </p>
                                  ) : (
                                    <p className="mt-3 text-sm italic text-slate-400">
                                      No written comment.
                                    </p>
                                  )}
                                </motion.article>
                              );
                            })}
                          </div>
                        )}

                        {!reviewsLoading &&
                          reviews.length > 0 &&
                          reviewPages > 1 && (
                            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-5">
                              <button
                                disabled={reviewPage <= 1}
                                onClick={() =>
                                  setReviewPage((current) => current - 1)
                                }
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold transition-colors hover:border-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Previous
                              </button>
                              <span className="text-sm text-slate-500">
                                Page {reviewPage} of {reviewPages}
                              </span>
                              <button
                                disabled={reviewPage >= reviewPages}
                                onClick={() =>
                                  setReviewPage((current) => current + 1)
                                }
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold transition-colors hover:border-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Next
                              </button>
                            </div>
                          )}
                      </section>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* BOOKING PANEL */}

            <motion.aside
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: easeOut }}
              className="rounded-xl border border-slate-200 bg-stone-50 p-6 lg:sticky lg:top-20"
            >
              <p className="text-sm text-slate-600">Starting from</p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
                {price ?? "Contact for price"}
              </p>

              {provider.isAvailable != null && (
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      provider.isAvailable ? "bg-emerald-600" : "bg-slate-400"
                    }`}
                  />
                  {provider.isAvailable
                    ? "Available for bookings"
                    : "Not taking bookings right now"}
                </p>
              )}

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={bookNow}
                className="mt-6 w-full rounded-lg bg-emerald-800 px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                Book now
              </motion.button>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={messageProvider}
                  disabled={!phone && !provider.email}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Message
                </motion.button>

                <motion.a
                  whileTap={phone ? { scale: 0.97 } : undefined}
                  href={phone ? `tel:${phone}` : undefined}
                  aria-disabled={!phone}
                  onClick={(event) => {
                    if (!phone) event.preventDefault();
                  }}
                  className={`rounded-lg border border-slate-300 bg-white px-3 py-3 text-center text-sm font-semibold text-slate-800 transition-colors hover:border-emerald-700 hover:bg-emerald-50 ${
                    !phone ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  Call
                </motion.a>
              </div>
            </motion.aside>
          </div>
        </div>

        {/* Mobile booking bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div>
            <p className="text-xs text-slate-500">Starting from</p>
            <p className="text-lg font-bold">{price ?? "Contact for price"}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={bookNow}
            className="rounded-lg bg-emerald-800 px-6 py-3 text-sm font-semibold text-white"
          >
            Book now
          </motion.button>
        </div>
      </main>
    </MotionConfig>
  );
}