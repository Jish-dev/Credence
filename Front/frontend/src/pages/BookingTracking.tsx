
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
} from "react-leaflet";
import { divIcon } from "leaflet";
import { ArrowLeft, Clock, MapPin, Navigation } from "lucide-react";

import "leaflet/dist/leaflet.css";

import { api } from "../api";
import { connectSocket } from "../services/socket";

// ========================================
// TYPES
// ========================================

type TravelStatus = "idle" | "on-the-way" | "arrived" | "stopped";

type ProviderLocation = {
  latitude: number;
  longitude: number;
  updatedAt: string;
} | null;

type TrackingData = {
  bookingStatus: string;
  travelStatus: TravelStatus;
  trackingActive: boolean;
  provider: {
    _id?: string;
    name: string;
    title?: string;
    category?: string;
    profileImage?: string;
  } | null;
  providerLocation: ProviderLocation;
  trackingStartedAt: string | null;
  trackingEndedAt: string | null;
};

type TrackingSocketEvent = {
  bookingId: string;
  travelStatus: TravelStatus;
  location: ProviderLocation;
};

// ========================================
// MAP MARKER
// ========================================

const providerIcon = divIcon({
  className: "",
  html: `
    <div style="
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #047857;
      border: 4px solid white;
      box-shadow: 0 2px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 19px;
    ">●</div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

// Keep map centered when provider moves.
function MapUpdater({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom());
  }, [latitude, longitude, map]);

  return null;
}

// ========================================
// STATUS LABEL
// ========================================

const getTravelStatusLabel = (status: TravelStatus) => {
  switch (status) {
    case "on-the-way":
      return "Provider is on the way";
    case "arrived":
      return "Provider has arrived";
    case "stopped":
      return "Live tracking stopped";
    default:
      return "Waiting for provider";
  }
};

// ========================================
// BOOKING TRACKING PAGE
// ========================================

export default function BookingTracking() {
  const { id } = useParams<{ id: string }>();

  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ========================================
  // FETCH TRACKING + SOCKET CONNECTION
  // ========================================

  useEffect(() => {
    if (!id) {
      setError("Invalid booking ID.");
      setLoading(false);
      return;
    }

    let mounted = true;
    let socket: ReturnType<typeof connectSocket> | null = null;
    let requestVersion = 0;

    // Reconcile with the database on load, reconnect and status changes.
    const fetchTracking = async (showError = false) => {
      const version = ++requestVersion;
      try {
        const response = await api.get(`/bookings/my/${id}/tracking`);
        const latest = response.data?.tracking as TrackingData | undefined;
        if (!mounted || version !== requestVersion || !latest) return;
        setTracking(latest);
        setError("");
      } catch (err) {
        if (mounted && version === requestVersion && showError) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load tracking details."
          );
        }
      } finally {
        if (mounted && version === requestVersion) setLoading(false);
      }
    };

    const handleTrackingUpdate = (data: TrackingSocketEvent) => {
      if (!mounted || data.bookingId !== id) return;

      // Invalidate any older HTTP response that could overwrite this event.
      requestVersion++;
      setTracking((previous) => {
        if (!previous) return previous;
        const active =
          data.travelStatus === "on-the-way" ||
          data.travelStatus === "arrived";
        return {
          ...previous,
          travelStatus: data.travelStatus,
          trackingActive: active,
          providerLocation: !active
            ? null
            : data.location ??
              (data.travelStatus === "arrived"
                ? previous.providerLocation
                : null),
        };
      });

      // The event has no bookingStatus, so fetch the canonical status
      // after service starts or tracking ends.
      if (data.travelStatus === "stopped") void fetchTracking();
    };

    const handleReconnect = () => {
      if (mounted) void fetchTracking();
    };

    try {
      socket = connectSocket();
      socket.on("provider:tracking:update", handleTrackingUpdate);
      socket.on("connect", handleReconnect);
    } catch (err) {
      console.error("Socket connection failed:", err);
    }

    void fetchTracking(true);

    // Booking completion does not emit a tracking event, so periodically
    // reconcile the displayed booking status while this page is open.
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchTracking();
    }, 20000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void fetchTracking();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      window.clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
      socket?.off("provider:tracking:update", handleTrackingUpdate);
      socket?.off("connect", handleReconnect);
      // Do not disconnect the shared app-wide socket here.
    };
  }, [id]);

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />

          <p className="mt-4 text-sm text-gray-500">
            Loading tracking details...
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // ERROR
  // ========================================

  if (error || !tracking) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <p className="font-semibold text-gray-800">
          {error || "Tracking information not found."}
        </p>

        <Link
          to="/my-bookings"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"
        >
          <ArrowLeft size={16} />
          Back to My Bookings
        </Link>
      </div>
    );
  }

  // ========================================
  // LOCATION DETAILS
  // ========================================

  const location = tracking.trackingActive ? tracking.providerLocation : null;

  const lastUpdated = location?.updatedAt
    ? new Date(location.updatedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const isArrived = tracking.travelStatus === "arrived";
  const isOnTheWay = tracking.travelStatus === "on-the-way";
  const isStopped = tracking.travelStatus === "stopped";

  // ========================================
  // UI
  // ========================================

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">

        {/* Back Navigation */}

        <Link
          to="/my-bookings"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-emerald-700"
        >
          <ArrowLeft size={17} />
          Back to My Bookings
        </Link>

        {/* Page Heading */}

        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            CREDENCE LIVE TRACKING
          </p>

          <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            Track your service provider
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Follow your provider's journey to your location.
          </p>
        </div>

        {/* Booking Information */}

        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Booking status
              </p>

              <p className="mt-1 font-semibold capitalize text-gray-900">
                {tracking.bookingStatus.replace("-", " ")}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Navigation size={21} />
              </div>

              <div>
                <p className="font-semibold text-gray-900">
                  {getTravelStatusLabel(tracking.travelStatus)}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {isOnTheWay
                    ? location ? "Receiving live location updates" : "Waiting for GPS coordinates"
                    : isArrived
                      ? "Provider has reached your location"
                      : isStopped
                        ? "Location sharing has ended"
                        : "Waiting for provider to start tracking"}
                </p>
              </div>
            </div>
          </div>

          {/* Provider Information */}

          {tracking.provider && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500">
                Your service provider
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {tracking.provider.name}
              </p>

              <p className="text-sm text-gray-500">
                {tracking.provider.title ||
                  tracking.provider.category ||
                  "Service provider"}
              </p>
            </div>
          )}
        </div>

        {/* PROVIDER MAP */}

        {location ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

            {/* Map Header */}

            <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-emerald-700" />

                <span className="font-semibold text-gray-900">
                  {isArrived
                    ? "Provider's last shared location"
                    : "Provider's current location"}
                </span>
              </div>

              {lastUpdated && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock size={14} />
                  Last updated at {lastUpdated}
                </span>
              )}
            </div>

            {/* Leaflet Map */}

            <MapContainer
              center={[
                location.latitude,
                location.longitude,
              ]}
              zoom={16}
              scrollWheelZoom
              className="h-[420px] w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapUpdater
                latitude={location.latitude}
                longitude={location.longitude}
              />

              <Marker
                position={[
                  location.latitude,
                  location.longitude,
                ]}
                icon={providerIcon}
              />
            </MapContainer>
          </div>
        ) : (

          /* WAITING / STOPPED STATE */

          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <MapPin size={25} />
            </div>

            <h2 className="mt-4 font-semibold text-gray-900">
              {isStopped
                ? "Live tracking has ended"
                : isArrived
                  ? "Provider has arrived"
                  : "Waiting for provider location"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              {isStopped
                ? "The provider has stopped sharing their live location."
                : isArrived
                  ? "Your provider has marked arrival. No location was received for this update."
                  : "The map will appear when your provider starts sharing their GPS location."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
