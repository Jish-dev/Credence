
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

type BookingType = "on_demand" | "pre_booking";

interface BookingForm {
  bookingType: BookingType;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  location: string;
  contactPhone: string;
  description: string;
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
    bookingType: "on_demand",
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
  // BOOKING SUBMISSION
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

    if (createdBookingId) {
      setError("Your booking has already been submitted.");
      return;
    }

    if (form.bookingType === "pre_booking") {
      if (!form.bookingDate || !form.bookingTime) {
        setError(
          "Please select your preferred pre-booking date and time."
        );
        return;
      }

      if (!isBookingTimeValid(form.bookingDate, form.bookingTime)) {
        setError(
          "Please choose a pre-booking time at least 30 minutes from now."
        );
        return;
      }
    }

    if (!form.location.trim()) {
      setError("Please enter your service location.");
      return;
    }

    if (!form.contactPhone.trim()) {
      setError("Please enter your contact phone number.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        providerId: provider._id,
        bookingType: form.bookingType,
        bookingDate:
          form.bookingType === "pre_booking"
            ? form.bookingDate
            : null,
        bookingTime:
          form.bookingType === "pre_booking"
            ? form.bookingTime
            : "",
        location: form.location.trim(),
        contactPhone: form.contactPhone.trim(),
        description: form.description.trim(),
      };

      console.log("CREDENCE BOOKING REQUEST:", payload);

      const response = await api.post("/bookings", payload);

      const booking =
        response.data?.booking ??
        response.data?.data?.booking ??
        response.data?.data;

      if (!booking?._id) {
        throw new Error("Booking could not be created.");
      }

      setCreatedBookingId(booking._id);

      setSuccess(
        "Your booking request has been submitted successfully. You can track its status in My Bookings. Payment will be available after the service is completed."
      );

      console.log("CREDENCE BOOKING CREATED:", booking);
    } catch (err: any) {
      console.error("CREDENCE BOOKING ERROR:", err?.response?.data || err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to process your booking. Please try again."
      );
    } finally {
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
  // BOOKING SUCCESS SCREEN
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
            Booking submitted!
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {success}
          </p>

          <p className="mt-3 text-sm text-slate-500">
            Selected professional: {provider.name}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => navigate("/my-bookings")}
              className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Track My Booking
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

              {/* BOOKING TYPE */}

              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Choose booking type
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((current) => ({
                        ...current,
                        bookingType: "on_demand",
                        bookingDate: "",
                        bookingTime: "",
                      }));
                      setError("");
                    }}
                    aria-pressed={form.bookingType === "on_demand"}
                    className={`rounded-2xl border p-4 text-left transition ${
                      form.bookingType === "on_demand"
                        ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Clock size={17} className="text-emerald-700" />
                      Book Now
                    </span>

                    <span className="mt-2 block text-xs leading-5 text-slate-500">
                      Request the service immediately. Our admin team will check availability and confirm.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForm((current) => ({
                        ...current,
                        bookingType: "pre_booking",
                      }));
                      setError("");
                    }}
                    aria-pressed={form.bookingType === "pre_booking"}
                    className={`rounded-2xl border p-4 text-left transition ${
                      form.bookingType === "pre_booking"
                        ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <CalendarDays size={17} className="text-emerald-700" />
                      Pre-booking
                    </span>

                    <span className="mt-2 block text-xs leading-5 text-slate-500">
                      Choose a preferred future date and time for your service.
                    </span>
                  </button>
                </div>
              </div>

              {/* PRE-BOOKING DATE AND TIME */}

              {form.bookingType === "pre_booking" && (
                <div className="grid gap-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 sm:grid-cols-2">
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
                      disabled={!form.bookingDate}
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      Select a time at least 30 minutes from now.
                    </p>
                  </div>
                </div>
              )}

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
                />
              </div>

              {/* SUBMIT BOOKING */}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting Booking..." : "Confirm Booking"}
              </button>

              <p className="text-center text-xs text-slate-400">
                No payment required now. Pay securely after service completion.
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
              Your booking will be submitted first. Payment becomes available after the service is completed.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
