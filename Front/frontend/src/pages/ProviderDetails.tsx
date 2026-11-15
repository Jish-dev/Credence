import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Star, ArrowLeft, ArrowUpRight, BadgeCheck, MapPin, BriefcaseBusiness, Heart, Share2, Phone, MessageCircle, CalendarDays, Check, ChevronLeft, ChevronRight, RefreshCw, ShieldCheck } from "lucide-react";
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
  // REDESIGNED PROFILE
  // ========================================

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen bg-[#f6f8f6] pb-28 text-[#15251e] selection:bg-lime-200 lg:pb-16">
        <section className="relative isolate overflow-hidden bg-[#052d21] text-white">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 80% 12%, #1f8c55 0, transparent 37%), radial-gradient(circle at 8% 100%, #0d6144 0, transparent 35%)" }} />
          <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-12 h-80 w-80 rounded-full border border-white/10 sm:h-[34rem] sm:w-[34rem]" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 top-28 h-64 w-64 rounded-full border border-white/10 sm:h-[27rem] sm:w-[27rem]" />
          <div className="relative mx-auto max-w-7xl px-5 pb-12 pt-7 sm:px-8 sm:pb-16 lg:px-10">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition hover:text-white"><ArrowLeft size={16} /> Back to professionals</button>
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: easeOut }} className="mt-10 flex flex-col gap-7 md:flex-row md:items-end md:gap-9">
              <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-[1.5rem] border-4 border-white/15 bg-[#1b674d] shadow-2xl sm:h-44 sm:w-44">
                <div className="flex h-full w-full items-center justify-center text-7xl font-semibold text-white/70">{provider.name.charAt(0).toUpperCase()}</div>
                {provider.profileImage && <img src={provider.profileImage} alt={provider.name} className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90">{provider.title || provider.category || "Service professional"}</span>
                  {verified && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d7f6a2] px-3 py-1 text-xs font-bold text-[#174229]"><BadgeCheck size={14} /> Verified professional</span>}
                </div>
                <h1 className="break-words text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">{provider.name}</h1>
                <p className="mt-3 flex items-center gap-2 text-sm text-white/75 sm:text-base"><MapPin size={17} className="shrink-0 text-[#b8eb91]" />{location}</p>
                <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-white/85">
                  <span className="inline-flex items-center gap-2"><Star size={17} className="fill-[#d6f68e] text-[#d6f68e]" /><strong className="text-white">{rating}</strong><span className="text-white/60">({totalReviews} reviews)</span></span>
                  <span className="inline-flex items-center gap-2"><BriefcaseBusiness size={17} className="text-[#b8eb91]" />{experience} experience</span>
                  {provider.isAvailable != null && <span className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${provider.isAvailable ? "bg-lime-300" : "bg-white/40"}`} />{provider.isAvailable ? "Available for bookings" : "Currently unavailable"}</span>}
                </div>
              </div>
              <div className="flex gap-2 self-start md:self-end">
                <button onClick={shareProfile} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-medium transition hover:bg-white/20"><Share2 size={17} />{copied ? "Copied" : "Share"}</button>
                <button onClick={() => setFavorite(v => !v)} aria-pressed={favorite} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${favorite ? "border-lime-200 bg-lime-200 text-[#153b25]" : "border-white/25 bg-white/10 text-white hover:bg-white/20"}`}><Heart size={17} className={favorite ? "fill-current" : ""} />{favorite ? "Saved" : "Save"}</button>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_350px] lg:gap-12">
            <div className="min-w-0">
              <div role="tablist" aria-label="Profile sections" className="sticky top-0 z-20 -mx-5 flex gap-7 overflow-x-auto border-b border-[#dfe6df] bg-[#f6f8f6]/95 px-5 pt-3 backdrop-blur sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:px-0">
                {tabs.map(tab => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`relative shrink-0 py-5 text-sm font-semibold transition ${activeTab === tab.id ? "text-[#075f43]" : "text-[#738078] hover:text-[#15251e]"}`}>{tab.label}{activeTab === tab.id && <motion.span layoutId="credence-profile-tab" className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[#07845b]" />}</button>)}
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={activeTab} role="tabpanel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="py-9">
                  {activeTab === "overview" && <div className="space-y-7">
                    <section className="rounded-2xl border border-[#e3e9e3] bg-white p-6 shadow-sm sm:p-8">
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#07845b]">Meet your professional</p>
                      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">About {provider.name}</h2>
                      <p className="mt-4 max-w-2xl whitespace-pre-wrap text-[15px] leading-8 text-[#59685e]">{provider.description || provider.bio || "This professional hasn't added a description yet. Contact them to learn more about their work."}</p>
                      <div className="mt-7 grid gap-4 border-t border-[#edf0ed] pt-6 sm:grid-cols-3">
                        <div><p className="text-xs text-[#7b887e]">Experience</p><p className="mt-1 font-semibold">{experience}</p></div>
                        <div><p className="text-xs text-[#7b887e]">Customer rating</p><p className="mt-1 font-semibold">{rating} / 5</p></div>
                        <div><p className="text-xs text-[#7b887e]">Verification</p><p className="mt-1 font-semibold">{verified ? "Verified" : "Not verified"}</p></div>
                      </div>
                    </section>
                    <section className="rounded-2xl border border-[#e3e9e3] bg-white p-6 shadow-sm sm:p-8">
                      <div className="flex items-center justify-between gap-3"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#07845b]">What they do</p><h2 className="text-2xl font-semibold tracking-tight">Services offered</h2></div>{services.length > 4 && <button onClick={() => setActiveTab("services")} className="inline-flex items-center gap-1 text-sm font-semibold text-[#087a54] hover:underline">View all <ArrowUpRight size={15}/></button>}</div>
                      {services.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2">{services.slice(0,4).map((service,index) => <div key={`${service}-${index}`} className="flex items-center gap-3 rounded-xl border border-[#e7ece7] bg-[#fafcf9] p-4 text-sm font-semibold"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e3f3e8] text-[#07845b]"><Check size={16}/></span>{service}</div>)}</div> : <p className="mt-5 text-sm text-[#718076]">No services have been added yet.</p>}
                    </section>
                  </div>}
                  {activeTab === "services" && <section className="rounded-2xl border border-[#e3e9e3] bg-white p-6 shadow-sm sm:p-8"><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#07845b]">Expertise</p><h2 className="text-2xl font-semibold tracking-tight">Services offered</h2>{services.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2">{services.map((service,index) => <div key={`${service}-${index}`} className="flex items-center gap-3 rounded-xl border border-[#e7ece7] bg-[#fafcf9] p-4 text-sm font-semibold"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e3f3e8] text-[#07845b]"><Check size={16}/></span>{service}</div>)}</div> : <p className="mt-5 text-sm text-[#718076]">No services listed.</p>}</section>}
                  {activeTab === "reviews" && <div className="space-y-6">
                    <section className="rounded-2xl border border-[#e3e9e3] bg-white p-6 shadow-sm sm:p-8"><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#07845b]">Customer feedback</p><h2 className="text-2xl font-semibold tracking-tight">Ratings & reviews</h2><div className="mt-7 grid gap-7 sm:grid-cols-[160px_1fr] sm:items-center"><div><p className="text-6xl font-semibold tracking-tight">{rating}</p><div className="mt-2"><StarRating rating={averageRating} size={17}/></div><p className="mt-2 text-xs text-[#718076]">{totalReviews} total reviews</p></div><div className="space-y-2.5">{ratingCounts.map(({star,count}) => <div key={star} className="flex items-center gap-3 text-xs"><span className="w-7 text-[#526158]">{star} ★</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#edf1ed]"><motion.div initial={{width:0}} animate={{width:`${reviews.length ? count/reviews.length*100 : 0}%`}} transition={{duration:.6}} className="h-full rounded-full bg-[#0b9364]" /></div><span className="w-5 text-right text-[#718076]">{count}</span></div>)}{reviewPages>1 && <p className="text-xs text-[#859188]">Distribution reflects the current page only.</p>}</div></div></section>
                    <section className="rounded-2xl border border-[#e3e9e3] bg-white p-6 shadow-sm sm:p-8"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Customer reviews <span className="text-[#8b968e]">({reviewTotal})</span></h3><button onClick={refreshReviews} disabled={reviewsLoading} className="inline-flex items-center gap-2 text-sm font-semibold text-[#087a54] disabled:opacity-40"><RefreshCw size={15}/> Refresh</button></div>
                      {reviewsLoading ? <div className="mt-6 space-y-4">{[1,2,3].map(i=><div key={i} className="h-24 animate-pulse rounded-xl bg-[#f1f4f1]" />)}</div> : reviewsError ? <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{reviewsError} <button className="font-semibold underline" onClick={refreshReviews}>Try again</button></p> : reviews.length===0 ? <div className="py-14 text-center"><p className="font-semibold">No reviews yet</p><p className="mt-2 text-sm text-[#7b887e]">Customer reviews will appear here after completed bookings.</p></div> : <div className="mt-6 divide-y divide-[#edf0ed]">{reviews.map((review,index) => {const name=getCustomerName(review.customer);const photo=getCustomerImage(review.customer);return <motion.article key={review._id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:index*.05}} className="py-6"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e5f1e8] font-semibold text-[#166b4b]">{photo?<img src={photo} alt="" className="h-full w-full object-cover"/>:name.charAt(0).toUpperCase()}</div><div><p className="text-sm font-semibold">{name}</p><p className="mt-0.5 text-xs text-[#849086]">{formatDate(review.createdAt)}</p></div></div><StarRating rating={review.rating}/></div><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#5e6b62]">{review.comment || "No written comment."}</p></motion.article>})}</div>}
                      {!reviewsLoading && reviews.length>0 && reviewPages>1 && <div className="mt-5 flex items-center justify-between border-t border-[#edf0ed] pt-5"><button disabled={reviewPage<=1} onClick={()=>setReviewPage(v=>v-1)} className="inline-flex items-center gap-1 rounded-lg border border-[#dce5dd] px-3 py-2 text-sm font-semibold disabled:opacity-40"><ChevronLeft size={15}/> Previous</button><span className="text-xs text-[#718076]">Page {reviewPage} of {reviewPages}</span><button disabled={reviewPage>=reviewPages} onClick={()=>setReviewPage(v=>v+1)} className="inline-flex items-center gap-1 rounded-lg border border-[#dce5dd] px-3 py-2 text-sm font-semibold disabled:opacity-40">Next <ChevronRight size={15}/></button></div>}
                    </section>
                  </div>}
                </motion.div>
              </AnimatePresence>
            </div>
            <motion.aside initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:.45,delay:.1}} className="mt-8 hidden rounded-2xl border border-[#dfe8df] bg-white p-6 shadow-[0_18px_55px_-35px_rgba(0,50,30,.35)] lg:sticky lg:top-8 lg:block">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#829087]">Service pricing</p><p className="mt-2 text-4xl font-semibold tracking-tight">{price ?? "Ask for price"}</p><p className="mt-2 text-xs text-[#7b887e]">{price ? "Starting price · Final cost may vary" : "Contact the professional for pricing"}</p>
              <div className="my-6 h-px bg-[#edf0ed]" />
              <p className="flex items-center gap-2 text-sm text-[#526358]"><ShieldCheck size={18} className="text-[#07845b]"/>{verified ? "Credence verified provider" : "Provider profile on Credence"}</p>
              <button onClick={bookNow} disabled={provider.isAvailable===false} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#087a54] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#056342] disabled:cursor-not-allowed disabled:opacity-50"><CalendarDays size={18}/> Book this professional <ArrowUpRight size={17}/></button>
              <div className="mt-3 grid grid-cols-2 gap-3"><button onClick={messageProvider} disabled={!phone&&!provider.email} className="flex items-center justify-center gap-2 rounded-xl border border-[#dce5dd] py-3 text-sm font-semibold transition hover:bg-[#f4f8f4] disabled:opacity-40"><MessageCircle size={17}/> Message</button><a href={phone?`tel:${phone}`:undefined} onClick={e=>{if(!phone)e.preventDefault()}} aria-disabled={!phone} className={`flex items-center justify-center gap-2 rounded-xl border border-[#dce5dd] py-3 text-sm font-semibold transition hover:bg-[#f4f8f4] ${!phone?"pointer-events-none opacity-40":""}`}><Phone size={17}/> Call</a></div>
              <p className="mt-5 text-center text-xs leading-5 text-[#87938a]">Review the service details before confirming your booking.</p>
            </motion.aside>
          </div>
        </div>
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-[#e0e7e0] bg-white/95 px-5 py-3 shadow-[0_-10px_30px_rgba(0,0,0,.04)] backdrop-blur lg:hidden"><div className="min-w-0"><p className="text-[11px] text-[#819087]">Starting from</p><p className="truncate text-lg font-bold">{price ?? "Ask for price"}</p></div><button onClick={bookNow} disabled={provider.isAvailable===false} className="inline-flex items-center gap-2 rounded-xl bg-[#087a54] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Book now <ArrowUpRight size={17}/></button></div>
      </main>
    </MotionConfig>
  );
}
