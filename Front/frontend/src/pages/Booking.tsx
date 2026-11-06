
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  ClipboardList,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import { api } from "../api";

interface Provider {
  _id: string;
  name: string;
  title?: string;
  category?: string;
  profileImage?: string;
  startingPrice?: number;
  location?: string;
  city?: string;
  area?: string;
}

interface BookingForm {
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  location: string;
  contactPhone: string;
  description: string;
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

// ========================================
// DATE HELPERS
// ========================================

// Get today's date in India Standard Time.
const getToday = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

// Get the current time in India Standard Time.
const getCurrentISTTime = () => {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
};

// Calculate the earliest allowed time.
// Booking must be at least 30 minutes ahead.
const getMinimumBookingTime = (bookingDate: string) => {
  if (!bookingDate || bookingDate !== getToday()) {
    return undefined;
  }

  const minimum = new Date(Date.now() + 30 * 60 * 1000);

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(minimum);
};

// Validate selected date and time using IST.
const isBookingTimeValid = (
  bookingDate: string,
  bookingTime: string
) => {
  if (!bookingDate || !bookingTime) return false;

  const selectedDateTime = new Date(
    `${bookingDate}T${bookingTime}:00+05:30`
  );

  if (Number.isNaN(selectedDateTime.getTime())) {
    return false;
  }

  return (
    selectedDateTime.getTime() >=
    Date.now() + 30 * 60 * 1000
  );
};

// Load Razorpay Checkout.
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => resolve(!!window.Razorpay);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

export default function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const providerId = searchParams.get("providerId");

  const [provider, setProvider] = useState<Provider | null>(null);

  const [loadingProvider, setLoadingProvider] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createdBookingId, setCreatedBookingId] = useState<string | null>(
    null
  );

  const [form, setForm] = useState<BookingForm>({
    serviceName: "",
    bookingDate: "",
    bookingTime: "",
    location: "",
    contactPhone: "",
    description: "",
  });

  // ========================================
  // LOAD PROVIDER
  // ========================================

  useEffect(() => {
    let active = true;

    const loadProvider = async () => {
      if (!providerId) {
        setError(
          "Provider information is missing. Please select a provider first."
        );
        setLoadingProvider(false);
        return;
      }

      try {
        const response = await api.get(`/providers/${providerId}`);
        const result = response.data;

        const data =
          result?.provider ??
          result?.data?.provider ??
          result?.data ??
          result;

        if (!data?._id) {
          throw new Error("Provider details could not be found.");
        }

        if (active) {
          setProvider(data);

          setForm((current) => ({
            ...current,
            serviceName: data.category || data.title || "",
            location: [data.area, data.city, data.location]
              .filter(Boolean)
              .filter(
                (value: string, index: number, values: string[]) =>
                  values.indexOf(value) === index
              )
              .join(", "),
          }));
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load provider details."
          );
        }
      } finally {
        if (active) {
          setLoadingProvider(false);
        }
      }
    };

    loadProvider();

    return () => {
      active = false;
    };
  }, [providerId]);

  // ========================================
  // FORM HANDLER
  // ========================================

  const updateField = (field: keyof BookingForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // ========================================
  // PAYMENT VERIFICATION
  // ========================================

  const verifyPayment = async (
    paymentResponse: RazorpayPaymentResponse
  ) => {
    try {
      await api.post("/payments/verify-payment", {
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
      });

      setSuccess(
        "Your payment has been verified successfully. You can now track your booking."
      );
    } catch (err) {
      console.error("PAYMENT VERIFICATION ERROR:", err);

      setError(
        "Payment was submitted, but verification is pending. Please check My Bookings before attempting another payment."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ========================================
  // CREATE ORDER AND OPEN CHECKOUT
  // ========================================

  const openPaymentCheckout = async (bookingId: string) => {
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded) {
      throw new Error(
        "Unable to load Razorpay Checkout. Please check your internet connection."
      );
    }

    const orderResponse = await api.post("/payments/create-order", {
      bookingId,
    });

    const order = orderResponse.data?.data;

    if (!order?.razorpayOrderId || !order?.keyId) {
      throw new Error("Unable to create Razorpay payment order.");
    }

    if (!window.Razorpay) {
      throw new Error("Razorpay Checkout is unavailable.");
    }

    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "CREDENCE",
      description: `Service booking - ${
        provider?.title || provider?.category || provider?.name
      }`,
      order_id: order.razorpayOrderId,

      theme: {
        color: "#047857",
      },

      handler: async (response: RazorpayPaymentResponse) => {
        await verifyPayment(response);
      },

      modal: {
        ondismiss: () => {
          setError(
            "Payment was not completed. Your booking is saved. You can retry payment."
          );
          setSubmitting(false);
        },
      },
    };

    const checkout = new window.Razorpay(options);

    checkout.on("payment.failed", (response: any) => {
      console.error("RAZORPAY PAYMENT FAILED:", response);

      setError(
        response?.error?.description ||
          "Payment failed. Please try again."
      );

      setSubmitting(false);
    });

    checkout.open();
  };

  // ========================================
  // BOOKING + PAYMENT SUBMISSION
  // ========================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!providerId || !provider) {
      setError("Provider information is missing.");
      return;
    }

    if (!form.bookingDate || !form.bookingTime) {
      setError("Please select your preferred booking date and time.");
      return;
    }

    // Frontend validation: minimum 30 minutes in advance.
    if (!isBookingTimeValid(form.bookingDate, form.bookingTime)) {
      setError(
        "Please choose a booking time at least 30 minutes from now."
      );
      return;
    }

    try {
      setSubmitting(true);

      let bookingId: string;

      // Create booking only once.
      if (createdBookingId) {
        bookingId = createdBookingId;
      } else {
        const payload = {
          providerId: provider._id,
          bookingDate: form.bookingDate,
          bookingTime: form.bookingTime,
          location: form.location.trim(),
          contactPhone: form.contactPhone.trim(),
          description: form.description.trim(),
        };

        const bookingResponse = await api.post("/bookings", payload);
        const booking = bookingResponse.data?.booking;

        if (!booking?._id) {
          throw new Error("Booking could not be created.");
        }

        bookingId = booking._id;
        setCreatedBookingId(bookingId);
      }

      await openPaymentCheckout(bookingId);
    } catch (err) {
      console.error("BOOKING / PAYMENT ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to process your booking or payment. Please try again."
      );

      setSubmitting(false);
    }
  };

  // ========================================
  // LOADING SCREEN
  // ========================================

  if (loadingProvider) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-[#fbf9f6]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />

          <p className="mt-3 text-sm text-slate-500">
            Loading booking details...
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // PROVIDER ERROR SCREEN
  // ========================================

  if (!provider) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-[#fbf9f6] px-5">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Cannot start booking
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error || "Select a professional before continuing."}
          </p>

          <button
            onClick={() => navigate("/")}
            className="mt-5 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // PAYMENT SUCCESS SCREEN
  // ========================================

  if (success) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-[#fbf9f6] px-5 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
          <CheckCircle2
            size={52}
            className="mx-auto text-emerald-600"
          />

          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">
            Payment successful!
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {success}
          </p>

          <p className="mt-3 text-sm text-slate-500">
            Your booking with {provider.name} has been saved.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => navigate("/my-bookings")}
              className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              View My Bookings
            </button>

            <button
              onClick={() => navigate("/")}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

  // ========================================
  // MAIN BOOKING PAGE
  // ========================================

  return (
    <main className="min-h-screen bg-[#fbf9f6] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700"
        >
          <ArrowLeft size={18} />
          Back to Provider
        </button>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* BOOKING FORM */}

          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                CREDENCE / Booking
              </p>

              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Book a Professional
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Share a few details so the professional can respond to your request.
              </p>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {createdBookingId && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Your booking is saved. Complete the payment or retry it below.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              {/* SERVICE */}

              <div>
                <label
                  htmlFor="serviceName"
                  className="text-sm font-semibold text-slate-700"
                >
                  Service required
                </label>

                <input
                  id="serviceName"
                  value={form.serviceName}
                  onChange={(event) =>
                    updateField("serviceName", event.target.value)
                  }
                  placeholder="e.g. Electrical wiring"
                  className={inputClass}
                  required
                />
              </div>

              {/* DATE AND TIME */}

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="bookingDate"
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                  >
                    <CalendarDays size={16} className="text-emerald-700" />
                    Preferred date
                  </label>

                  <input
                    id="bookingDate"
                    type="date"
                    min={getToday()}
                    value={form.bookingDate}
                    onChange={(event) => {
                      updateField("bookingDate", event.target.value);
                      updateField("bookingTime", "");
                      setError("");
                    }}
                    className={inputClass}
                    required
                    disabled={!!createdBookingId}
                  />
                </div>

                <div>
                  <label
                    htmlFor="bookingTime"
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                  >
                    <Clock size={16} className="text-emerald-700" />
                    Preferred time
                  </label>

                  <input
                    id="bookingTime"
                    type="time"
                    min={getMinimumBookingTime(form.bookingDate)}
                    value={form.bookingTime}
                    onChange={(event) => {
                      updateField("bookingTime", event.target.value);
                      setError("");
                    }}
                    className={inputClass}
                    required
                    disabled={!form.bookingDate || !!createdBookingId}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Book at least 30 minutes in advance.
                  </p>
                </div>
              </div>

              {/* LOCATION */}

              <div>
                <label
                  htmlFor="location"
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                >
                  <MapPin size={16} className="text-emerald-700" />
                  Service location
                </label>

                <input
                  id="location"
                  value={form.location}
                  onChange={(event) =>
                    updateField("location", event.target.value)
                  }
                  placeholder="Enter your full service address"
                  className={inputClass}
                  required
                  disabled={!!createdBookingId}
                />
              </div>

              {/* PHONE */}

              <div>
                <label
                  htmlFor="contactPhone"
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                >
                  <Phone size={16} className="text-emerald-700" />
                  Contact phone
                </label>

                <input
                  id="contactPhone"
                  type="tel"
                  value={form.contactPhone}
                  onChange={(event) =>
                    updateField("contactPhone", event.target.value)
                  }
                  placeholder="Enter your phone number"
                  className={inputClass}
                  required
                  disabled={!!createdBookingId}
                />
              </div>

              {/* DESCRIPTION */}

              <div>
                <label
                  htmlFor="description"
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                >
                  <ClipboardList size={16} className="text-emerald-700" />
                  Describe your requirement
                </label>

                <textarea
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  placeholder="Tell us briefly what service you need..."
                  rows={4}
                  className={inputClass}
                  disabled={!!createdBookingId}
                />
              </div>

              {/* PAYMENT BUTTON */}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CreditCard size={18} />

                {submitting
                  ? "Processing..."
                  : createdBookingId
                    ? "Retry Payment"
                    : "Continue to Payment"}
              </button>

              <p className="text-center text-xs text-slate-400">
                Secure payment powered by Razorpay.
              </p>
            </form>
          </section>

          {/* PROVIDER SUMMARY */}

          <aside className="rounded-3xl border border-emerald-100 bg-[#eaf5ee] p-4 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl bg-white">
              <div className="h-44 bg-emerald-50">
                {provider.profileImage ? (
                  <img
                    src={provider.profileImage}
                    alt={provider.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl font-bold text-emerald-700">
                    {provider.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Selected Professional
                </p>

                <h2 className="mt-1 text-lg font-extrabold text-slate-950">
                  {provider.name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {provider.title ||
                    provider.category ||
                    "Professional Service"}
                </p>

                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <MapPin size={16} />

                  {provider.area ||
                    provider.city ||
                    provider.location ||
                    "Location not listed"}
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500">
                    Starting price
                  </p>

                  <p className="mt-1 text-2xl font-extrabold text-slate-950">
                    {provider.startingPrice != null
                      ? `₹${provider.startingPrice.toLocaleString("en-IN")}`
                      : "Contact for price"}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-4 px-2 text-center text-xs leading-5 text-emerald-800">
              Your payment amount is calculated securely using the saved service price.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
