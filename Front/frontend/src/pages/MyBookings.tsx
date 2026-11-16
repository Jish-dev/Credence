
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Phone,
  ArrowRight,
  RefreshCw,
  X,
  ClipboardList,
  BriefcaseBusiness,
  CreditCard,
  Star,
  Send,
  CheckCircle2,
} from "lucide-react";
import { api } from "../api";

// ========================================
// TYPES
// ========================================

type BookingStatus =
  | "pending"
  | "confirmed"
  | "in-progress"
  | "awaiting_customer_confirmation"
  | "completed"
  | "cancelled"
  | "rejected";

type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

interface Provider {
  _id: string;
  name: string;
  title?: string;
  category?: string;
  location?: string;
  profileImage?: string;
  contact?: string;
}

interface Booking {
  _id: string;
  provider: Provider | null;
  serviceName: string;
  description?: string;
  bookingDate: string;
  bookingTime: string;
  location: string;
  contactPhone: string;
  amount: number;
  status: BookingStatus;
  paymentStatus?: PaymentStatus;
  createdAt?: string;

  providerTravelStatus?: "idle" | "on-the-way" | "arrived" | "stopped";
  providerLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: string;
  } | null;
  trackingStartedAt?: string | null;
  trackingEndedAt?: string | null;
}

interface BookingResponse {
  success: boolean;
  message: string;
  bookings: Booking[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface Review {
  _id: string;
  booking: string | { _id: string };
  provider: string;
  rating: number;
  comment: string;
  status: "published" | "hidden";
  createdAt: string;
}

interface MyReviewsResponse {
  success: boolean;
  reviews: Review[];
}

interface PaymentOrderResponse {
  success: boolean;
  message: string;
  data: {
    paymentId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
  };
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
    source?: string;
    step?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  theme: {
    color: string;
  };
  handler: (response: RazorpayPaymentResponse) => void;
  modal: {
    ondismiss: () => void;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (
        event: "payment.failed",
        callback: (response: RazorpayFailureResponse) => void
      ) => void;
    };
  }
}

// ========================================
// CONSTANTS
// ========================================

const RAZORPAY_SCRIPT_URL =
  "https://checkout.razorpay.com/v1/checkout.js";

const filters = [
  { label: "All Bookings", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const statusStyles: Record<BookingStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  confirmed: "bg-blue-50 text-blue-700 border-blue-100",
  "in-progress": "bg-purple-50 text-purple-700 border-purple-100",
  awaiting_customer_confirmation:
    "bg-amber-50 text-amber-700 border-amber-100",
  completed: "bg-green-50 text-green-700 border-green-100",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  rejected: "bg-red-50 text-red-700 border-red-100",
};

const paymentStyles: Record<PaymentStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  paid: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  refunded: "bg-blue-50 text-blue-700",
};

// ========================================
// HELPERS
// ========================================

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const formatStatus = (status: string) =>
  status
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getBookingIdFromReview = (review: Review) =>
  typeof review.booking === "string"
    ? review.booking
    : review.booking?._id;

// Extract useful backend error messages.
const getErrorMessage = (
  err: unknown,
  fallback: string
): string => {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err
  ) {
    const response = (
      err as {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
};

// ========================================
// RAZORPAY SCRIPT LOADER
// ========================================

let razorpayScriptPromise: Promise<boolean> | null = null;

const loadRazorpayScript = (): Promise<boolean> => {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");

    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      resolve(Boolean(window.Razorpay));
    };

    script.onerror = () => {
      razorpayScriptPromise = null;
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
};

// ========================================
// MAIN COMPONENT
// ========================================

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);

  // Payment state
  const [payingBookingId, setPayingBookingId] = useState<string | null>(
    null
  );

  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");

  // Review state
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(
    new Set()
  );

  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");

  // ========================================
  // FETCH BOOKINGS
  // ========================================

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params: Record<string, string | number> = {
        page,
        limit: 10,
      };

      if (activeFilter !== "all") {
        params.status = activeFilter;
      }

      const response = await api.get<BookingResponse>("/bookings/my", {
        params,
      });

      setBookings(response.data.bookings || []);
      setTotal(response.data.pagination?.total || 0);
      setPages(response.data.pagination?.pages || 1);
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to load your bookings.")
      );
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ========================================
  // FETCH CUSTOMER REVIEWS
  // ========================================

  const fetchMyReviews = useCallback(async () => {
    try {
      setReviewLoading(true);

      const response = await api.get<MyReviewsResponse>("/reviews/my");

      const reviews = response.data.reviews || [];

      setReviewedBookingIds(
        new Set(
          reviews
            .map(getBookingIdFromReview)
            .filter((id): id is string => Boolean(id))
        )
      );
    } catch (err) {
      console.error("Failed to load customer reviews:", err);
    } finally {
      setReviewLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyReviews();
  }, [fetchMyReviews]);

  // ========================================
  // FILTER HANDLER
  // ========================================

  const changeFilter = (value: string) => {
    setActiveFilter(value);
    setPage(1);
    setSelectedBooking(null);
  };

  // ========================================
  // CANCEL BOOKING
  // ========================================

  const handleCancel = async (bookingId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    try {
      setCancellingId(bookingId);
      setError("");

      await api.patch(`/bookings/my/${bookingId}/cancel`);

      setSelectedBooking(null);
      await fetchBookings();
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to cancel booking.")
      );
    } finally {
      setCancellingId(null);
    }
  };

  const canCancel = (status: BookingStatus) =>
    status === "pending" || status === "confirmed";

  // ========================================
  // RAZORPAY PAYMENT
  // ========================================

  const handlePayment = async (booking: Booking) => {
    if (payingBookingId) return;

    if (booking.status !== "completed") {
      setPaymentError(
        "Payment is available only after the service is completed."
      );
      return;
    }

    if (booking.paymentStatus === "paid") {
      setPaymentError("This booking has already been paid.");
      return;
    }

    if (
      typeof booking.amount !== "number" ||
      !Number.isFinite(booking.amount) ||
      booking.amount <= 0
    ) {
      setPaymentError("A valid booking amount is not available.");
      return;
    }

    try {
      setPayingBookingId(booking._id);
      setPaymentError("");
      setPaymentSuccess("");
      setError("");

      // ------------------------------------
      // STEP 1: LOAD RAZORPAY
      // ------------------------------------

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error(
          "Unable to load Razorpay Checkout. Please refresh and try again."
        );
      }

      // ------------------------------------
      // STEP 2: CREATE PAYMENT ORDER
      // ------------------------------------

      const orderResponse = await api.post<PaymentOrderResponse>(
        "/payments/create-order",
        {
          bookingId: booking._id,
        }
      );

      const order = orderResponse.data?.data;

      if (!order) {
        throw new Error(
          "Payment order was not returned by the server."
        );
      }

      // ------------------------------------
      // STEP 3: VALIDATE ORDER
      // ------------------------------------

      const expectedAmount = Math.round(booking.amount * 100);

      const validOrderId =
        typeof order.razorpayOrderId === "string" &&
        /^order_[A-Za-z0-9]+$/.test(order.razorpayOrderId);

      const validTestKey =
        typeof order.keyId === "string" &&
        /^rzp_test_[A-Za-z0-9]+$/.test(order.keyId);

      const validAmount =
        typeof order.amount === "number" &&
        Number.isSafeInteger(order.amount) &&
        order.amount > 0;

      const validCurrency = order.currency === "INR";

      if (!validOrderId) {
        throw new Error("Invalid Razorpay order ID received from backend.");
      }

      if (!validTestKey) {
        console.error("Invalid Razorpay Test Mode key:", {
          keyPrefix: order.keyId?.slice(0, 9),
        });

        throw new Error(
          "Razorpay Test Mode key is missing or invalid. Check backend configuration."
        );
      }

      if (!validAmount || !validCurrency) {
        throw new Error(
          "Invalid Razorpay amount or currency received from backend."
        );
      }

      // booking.amount is in rupees.
      // Razorpay order.amount is in paise.

      if (order.amount !== expectedAmount) {
        console.error("CREDENCE AMOUNT MISMATCH:", {
          bookingAmountInRupees: booking.amount,
          expectedAmountInPaise: expectedAmount,
          razorpayAmount: order.amount,
        });

        throw new Error(
          "Payment amount does not match the booking amount."
        );
      }

      // ------------------------------------
      // STEP 4: DIAGNOSTIC LOG
      // ------------------------------------

      console.log("========== CREDENCE RAZORPAY CHECKOUT ==========");

      console.log({
        bookingId: booking._id,
        bookingAmount: booking.amount,
        expectedAmountInPaise: expectedAmount,
        razorpayOrderId: order.razorpayOrderId,
        razorpayAmount: order.amount,
        currency: order.currency,
        keyPrefix: order.keyId.slice(0, 9),
        mode: "TEST",
      });

      console.log("================================================");

      // ------------------------------------
      // STEP 5: INITIALIZE CHECKOUT
      // ------------------------------------

      const checkoutOptions: RazorpayOptions = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "CREDENCE",
        description: `Payment for ${booking.serviceName}`,
        order_id: order.razorpayOrderId,

        theme: {
          color: "#244b3b",
        },

        // --------------------------------
        // STEP 6: PAYMENT SUCCESS
        // --------------------------------

        handler: async (paymentResponse) => {
          try {
            console.log("CREDENCE RAZORPAY SUCCESS RESPONSE:", {
              orderId: paymentResponse.razorpay_order_id,
              paymentId: paymentResponse.razorpay_payment_id,
            });

            // Ensure Checkout returned the expected order.
            if (
              paymentResponse.razorpay_order_id !==
              order.razorpayOrderId
            ) {
              throw new Error(
                "Payment order ID mismatch. Please contact support."
              );
            }

            const verifyResponse = await api.post(
              "/payments/verify-payment",
              {
                razorpay_order_id:
                  paymentResponse.razorpay_order_id,

                razorpay_payment_id:
                  paymentResponse.razorpay_payment_id,

                razorpay_signature:
                  paymentResponse.razorpay_signature,
              }
            );

            if (verifyResponse.data?.success !== true) {
              throw new Error(
                verifyResponse.data?.message ||
                "Payment verification failed."
              );
            }

            setPaymentError("");

            setPaymentSuccess(
              "Payment successful! Your booking has been paid."
            );

            setSelectedBooking(null);

            await fetchBookings();
          } catch (err) {
            console.error(
              "CREDENCE PAYMENT VERIFICATION ERROR:",
              err
            );

            setPaymentError(
              getErrorMessage(
                err,
                "Payment verification failed. Please contact support before trying again."
              )
            );
          } finally {
            setPayingBookingId(null);
          }
        },

        // --------------------------------
        // STEP 7: CHECKOUT DISMISSED
        // --------------------------------

        modal: {
          ondismiss: () => {
            setPayingBookingId(null);
          },
        },
      };

      // ------------------------------------
      // STEP 8: OPEN CHECKOUT
      // ------------------------------------

      const checkout = new window.Razorpay(checkoutOptions);

      // ------------------------------------
      // STEP 9: PAYMENT FAILURE
      // ------------------------------------

      checkout.on("payment.failed", (response) => {
        const failure = response.error;

        console.error("========== RAZORPAY PAYMENT FAILED ==========");

        console.error({
          code: failure?.code,
          description: failure?.description,
          reason: failure?.reason,
          source: failure?.source,
          step: failure?.step,
          orderId: failure?.metadata?.order_id,
        });

        console.error("==============================================");

        setPaymentError(
          failure?.description ||
          "Payment failed. Please try again."
        );

        setPayingBookingId(null);
      });

      checkout.open();
    } catch (err) {
      console.error("CREDENCE PAYMENT INITIALIZATION ERROR:", err);

      setPaymentError(
        getErrorMessage(
          err,
          "Unable to start payment. Please try again."
        )
      );

      setPayingBookingId(null);
    }
  };

  // ========================================
  // OPEN REVIEW FORM
  // ========================================

  const openReviewForm = (booking: Booking) => {
    setReviewBooking(booking);
    setRating(0);
    setHoverRating(0);
    setComment("");
    setReviewError("");
    setReviewSuccess("");
    setSelectedBooking(null);
  };

  const closeReviewForm = () => {
    if (submittingReview) return;

    setReviewBooking(null);
    setRating(0);
    setHoverRating(0);
    setComment("");
    setReviewError("");
    setReviewSuccess("");
  };

  // ========================================
  // SUBMIT REVIEW
  // ========================================

  const handleSubmitReview = async () => {
    if (!reviewBooking) return;

    if (rating < 1 || rating > 5) {
      setReviewError("Please select a star rating.");
      return;
    }

    if (comment.trim().length > 1000) {
      setReviewError("Your review must be less than 1000 characters.");
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewError("");

      await api.post("/reviews", {
        bookingId: reviewBooking._id,
        rating,
        comment: comment.trim(),
      });

      setReviewedBookingIds((previous) => {
        const updated = new Set(previous);
        updated.add(reviewBooking._id);
        return updated;
      });

      setReviewSuccess(
        "Your review has been submitted successfully!"
      );

      window.setTimeout(() => {
        setReviewBooking(null);
        setReviewSuccess("");
        setRating(0);
        setComment("");
      }, 1200);
    } catch (err) {
      setReviewError(
        getErrorMessage(err, "Unable to submit your review. Please try again.")
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  // ========================================
  // SUMMARY COUNTS
  // ========================================

  const completedCount = bookings.filter(
    (booking) => booking.status === "completed"
  ).length;

  const cancelledCount = bookings.filter(
    (booking) => booking.status === "cancelled"
  ).length;

  // ========================================
  // UI
  // ========================================

  return (
    <main className="min-h-screen bg-[#f7f8f6] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72917e]">
              CREDENCE / ACCOUNT
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#153d32]">
              My Bookings
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Track and manage your service bookings.
            </p>
          </div>

          <button
            onClick={() => {
              fetchBookings();
              fetchMyReviews();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* SUMMARY */}

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total bookings</p>
            <h2 className="mt-2 text-3xl font-bold text-[#244b3b]">
              {total}
            </h2>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Completed on this page</p>
            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {loading ? "—" : completedCount}
            </h2>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Cancelled on this page</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-600">
              {loading ? "—" : cancelledCount}
            </h2>
          </div>
        </div>

        {/* FILTERS */}

        <div className="mt-7">
          <div className="flex gap-2 overflow-x-auto pb-3">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => changeFilter(filter.value)}
                className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition ${activeFilter === filter.value
                  ? "bg-[#244b3b] text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-[#315f4c] hover:text-[#315f4c]"
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* GENERAL ERROR */}

        {error && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            <span>{error}</span>

            <button onClick={() => setError("")}>
              <X size={17} />
            </button>
          </div>
        )}

        {/* PAYMENT ERROR */}

        {paymentError && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            <span>{paymentError}</span>

            <button onClick={() => setPaymentError("")}>
              <X size={17} />
            </button>
          </div>
        )}

        {/* PAYMENT SUCCESS */}

        {paymentSuccess && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              {paymentSuccess}
            </span>

            <button onClick={() => setPaymentSuccess("")}>
              <X size={17} />
            </button>
          </div>
        )}

        {/* BOOKING LIST */}

        <div className="mt-4 space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5"
              >
                <div className="h-5 w-1/3 rounded bg-gray-100" />
                <div className="mt-4 h-4 w-2/3 rounded bg-gray-100" />
                <div className="mt-5 h-10 rounded bg-gray-100" />
              </div>
            ))
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white px-5 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eaf3ed] text-[#315f4c]">
                <ClipboardList size={30} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-gray-900">
                No bookings found
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
                {activeFilter === "all"
                  ? "You haven't made any service bookings yet."
                  : `You don't have any ${formatStatus(activeFilter).toLowerCase()} bookings.`}
              </p>

              <Link
                to="/"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#244b3b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193c2e]"
              >
                Explore professionals
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            bookings.map((booking) => {
              const provider = booking.provider;
              const isReviewed = reviewedBookingIds.has(booking._id);

              const canReview =
                booking.status === "completed" &&
                !isReviewed &&
                !reviewLoading;

              const canPay =
                booking.status === "completed" &&
                booking.paymentStatus !== "paid";

              return (
                <article
                  key={booking._id}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
                >
                  {/* CARD HEADING */}

                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#eaf3ed] text-[#315f4c]">
                        {provider?.profileImage ? (
                          <img
                            src={provider.profileImage}
                            alt={provider.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <BriefcaseBusiness size={25} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-base font-bold text-gray-900 sm:text-lg">
                          {booking.serviceName}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          {provider?.name || "Professional"}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          ID: {booking._id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyles[booking.status]
                        }`}
                    >
                      {formatStatus(booking.status)}
                    </span>
                  </div>

                  {/* BOOKING DETAILS */}

                  <div className="mt-5 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <CalendarDays size={17} className="text-[#72917e]" />

                      <div>
                        <p className="text-xs text-gray-400">Booking date</p>
                        <p className="mt-0.5 text-sm font-semibold text-gray-700">
                          {formatDate(booking.bookingDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock3 size={17} className="text-[#72917e]" />

                      <div>
                        <p className="text-xs text-gray-400">Preferred time</p>
                        <p className="mt-0.5 text-sm font-semibold text-gray-700">
                          {booking.bookingTime}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <MapPin size={17} className="text-[#72917e]" />

                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">Location</p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-gray-700">
                          {booking.location}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Phone size={17} className="text-[#72917e]" />

                      <div>
                        <p className="text-xs text-gray-400">Contact number</p>
                        <p className="mt-0.5 text-sm font-semibold text-gray-700">
                          {booking.contactPhone}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CARD FOOTER */}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
                    <div>
                      <p className="text-xs text-gray-400">Booking amount</p>

                      <p className="mt-1 text-xl font-bold text-[#244b3b]">
                        {booking.amount != null
                          ? `₹${booking.amount.toLocaleString("en-IN")}`
                          : "Contact for price"}
                      </p>

                      {booking.paymentStatus && (
                        <span
                          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStyles[booking.paymentStatus]
                            }`}
                        >
                          <CreditCard size={12} />
                          Payment: {formatStatus(booking.paymentStatus)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">

                      {/* PAY NOW */}

                      {canPay && (
                        <button
                          onClick={() => handlePayment(booking)}
                          disabled={payingBookingId !== null}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {payingBookingId === booking._id ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <CreditCard size={16} />
                          )}

                          {payingBookingId === booking._id
                            ? "Processing..."
                            : "Pay Now"}
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        View details
                      </button>

                      {booking.status === "confirmed" && (
                        <Link
                          to={`/booking/${booking._id}/tracking`}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                        >
                          <MapPin size={16} />
                          Track Provider
                        </Link>
                      )}

                      {canReview && (
                        <button
                          onClick={() => openReviewForm(booking)}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#244b3b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#193c2e]"
                        >
                          <Star size={16} />
                          Write a Review
                        </button>
                      )}

                      {booking.status === "completed" && isReviewed && (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700">
                          <CheckCircle2 size={16} />
                          Reviewed
                        </span>
                      )}

                      {canCancel(booking.status) && (
                        <button
                          onClick={() => handleCancel(booking._id)}
                          disabled={cancellingId === booking._id}
                          className="rounded-xl border border-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {cancellingId === booking._id
                            ? "Cancelling..."
                            : "Cancel booking"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* PAGINATION */}

        {!loading && bookings.length > 0 && pages > 1 && (
          <div className="mt-7 flex items-center justify-center gap-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-gray-500">
              {page} of {pages}
            </span>

            <button
              disabled={page >= pages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {/* BOOKING DETAILS MODAL */}

        {selectedBooking && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setSelectedBooking(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#72917e]">
                    BOOKING DETAILS
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-gray-900">
                    {selectedBooking.serviceName}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Professional</span>
                  <span className="text-right font-semibold text-gray-800">
                    {selectedBooking.provider?.name || "Unavailable"}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Booking status</span>
                  <span className="font-semibold text-gray-800">
                    {formatStatus(selectedBooking.status)}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Payment status</span>
                  <span className="font-semibold text-gray-800">
                    {selectedBooking.paymentStatus
                      ? formatStatus(selectedBooking.paymentStatus)
                      : "Not available"}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Date</span>
                  <span className="font-semibold text-gray-800">
                    {formatDate(selectedBooking.bookingDate)}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Time</span>
                  <span className="font-semibold text-gray-800">
                    {selectedBooking.bookingTime}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Location</span>
                  <span className="max-w-[65%] text-right font-semibold text-gray-800">
                    {selectedBooking.location}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Contact</span>
                  <span className="font-semibold text-gray-800">
                    {selectedBooking.contactPhone}
                  </span>
                </div>

                <div className="flex justify-between gap-3 border-t border-gray-100 pt-4">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-[#244b3b]">
                    ₹{(selectedBooking.amount ?? 0).toLocaleString("en-IN")}
                  </span>
                </div>

                {selectedBooking.description && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-gray-500">Description</p>
                    <p className="mt-2 leading-6 text-gray-700">
                      {selectedBooking.description}
                    </p>
                  </div>
                )}
              </div>

              {/* PAY NOW IN MODAL */}

              {selectedBooking.status === "completed" &&
                selectedBooking.paymentStatus !== "paid" && (
                  <button
                    onClick={() => handlePayment(selectedBooking)}
                    disabled={payingBookingId !== null}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {payingBookingId === selectedBooking._id ? (
                      <RefreshCw size={17} className="animate-spin" />
                    ) : (
                      <CreditCard size={17} />
                    )}

                    {payingBookingId === selectedBooking._id
                      ? "Processing Payment..."
                      : "Pay Now"}
                  </button>
                )}

              {selectedBooking.status === "completed" &&
                !reviewedBookingIds.has(selectedBooking._id) && (
                  <button
                    onClick={() => openReviewForm(selectedBooking)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#244b3b] py-3 text-sm font-semibold text-white hover:bg-[#193c2e]"
                  >
                    <Star size={17} />
                    Write a Review
                  </button>
                )}

              {canCancel(selectedBooking.status) && (
                <button
                  onClick={() => handleCancel(selectedBooking._id)}
                  disabled={cancellingId === selectedBooking._id}
                  className="mt-3 w-full rounded-xl bg-red-50 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  {cancellingId === selectedBooking._id
                    ? "Cancelling..."
                    : "Cancel this booking"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* WRITE REVIEW MODAL */}

        {reviewBooking && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={closeReviewForm}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Modal header */}

              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#72917e]">
                    CREDENCE / FEEDBACK
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-[#153d32]">
                    Rate your experience
                  </h2>
                </div>

                <button
                  onClick={closeReviewForm}
                  disabled={submittingReview}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
                  aria-label="Close review form"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {/* Provider information */}

                <div className="flex items-center gap-3 rounded-2xl bg-[#f4f8f5] p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#e1eee5] text-[#315f4c]">
                    {reviewBooking.provider?.profileImage ? (
                      <img
                        src={reviewBooking.provider.profileImage}
                        alt={reviewBooking.provider.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <BriefcaseBusiness size={22} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {reviewBooking.provider?.name || "Professional"}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {reviewBooking.serviceName}
                    </p>
                  </div>
                </div>

                {/* Star rating */}

                <div className="mt-7 text-center">
                  <h3 className="text-base font-bold text-gray-900">
                    How was your experience?
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Select a rating from 1 to 5 stars.
                  </p>

                  <div className="mt-5 flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        disabled={submittingReview}
                        onMouseEnter={() => setHoverRating(value)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(value)}
                        aria-label={`Rate ${value} out of 5 stars`}
                        aria-pressed={rating === value}
                        className="rounded-lg p-1 transition hover:scale-110 disabled:cursor-not-allowed"
                      >
                        <Star
                          size={34}
                          strokeWidth={1.8}
                          className={
                            value <= (hoverRating || rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }
                        />
                      </button>
                    ))}
                  </div>

                  <p className="mt-3 text-sm font-semibold text-[#315f4c]">
                    {rating === 1 && "Poor"}
                    {rating === 2 && "Fair"}
                    {rating === 3 && "Good"}
                    {rating === 4 && "Very Good"}
                    {rating === 5 && "Excellent"}
                    {rating === 0 && "No rating selected"}
                  </p>
                </div>

                {/* Comment */}

                <div className="mt-7">
                  <label
                    htmlFor="review-comment"
                    className="mb-2 block text-sm font-semibold text-gray-800"
                  >
                    Share your experience
                    <span className="ml-1 font-normal text-gray-400">
                      (Optional)
                    </span>
                  </label>

                  <textarea
                    id="review-comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    disabled={submittingReview}
                    maxLength={1000}
                    rows={4}
                    placeholder="Tell others about your experience with this professional..."
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                  />

                  <p className="mt-1 text-right text-xs text-gray-400">
                    {comment.length}/1000
                  </p>
                </div>

                {/* Error */}

                {reviewError && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {reviewError}
                  </div>
                )}

                {/* Success */}

                {reviewSuccess && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    <CheckCircle2 size={18} />
                    {reviewSuccess}
                  </div>
                )}

                {/* Submit */}

                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={submittingReview || Boolean(reviewSuccess)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#244b3b] py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#193c2e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingReview ? (
                    <>
                      <RefreshCw size={17} className="animate-spin" />
                      Submitting...
                    </>
                  ) : reviewSuccess ? (
                    <>
                      <CheckCircle2 size={17} />
                      Submitted
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Review
                    </>
                  )}
                </button>

                <p className="mt-3 text-center text-xs text-gray-400">
                  Your feedback helps other customers make better decisions.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
