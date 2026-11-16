
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Navigation,
  Power,
} from "lucide-react";

import { api } from "../services/api";

type TrackingStatus = "idle" | "on-the-way" | "arrived" | "stopped";

export default function ProviderLiveTracking() {
  const { id } = useParams<{ id: string }>();

  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [error, setError] = useState("");

  const watchIdRef = useRef<number | null>(null);
  const sendingRef = useRef(false);
  const activeRef = useRef(false);

  const sendLocation = async (
    latitude: number,
    longitude: number,
  ) => {
    if (!id || sendingRef.current || !activeRef.current) return;

    sendingRef.current = true;

    try {
      await api.patch(`/bookings/provider/${id}/tracking/location`, {
        latitude,
        longitude,
      });

      setCoordinates({ latitude, longitude });
    } catch (err) {
      console.error("Location update failed:", err);
      setError("Unable to update your location. Please check your connection.");
    } finally {
      sendingRef.current = false;
    }
  };

  const startLocationWatch = () => {
    if (!navigator.geolocation) {
      setError("Your browser does not support location services.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        sendLocation(
          position.coords.latitude,
          position.coords.longitude,
        );
      },
      (geoError) => {
        console.error("GPS error:", geoError);

        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError("Location permission was denied. Enable it in your browser settings.");
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          setError("Your current location is unavailable. Please try again.");
        } else {
          setError("Unable to get your location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      },
    );

    watchIdRef.current = watchId;
  };

  const stopLocationWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    activeRef.current = false;
    setLocationEnabled(false);
  };

  const startTracking = async () => {
    if (!id) {
      setError("Booking ID is missing.");
      return;
    }

    if (!navigator.geolocation) {
      setError("Your browser does not support location services.");
      return;
    }

    setStarting(true);
    setError("");

    try {
      // Check GPS permission and get the initial position first.
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15000,
          });
        },
      );

      // Start tracking on the backend.
      await api.patch(`/bookings/provider/${id}/tracking/start`);

      activeRef.current = true;
      setStatus("on-the-way");
      setLocationEnabled(true);

      // Send the first location immediately.
      await sendLocation(
        position.coords.latitude,
        position.coords.longitude,
      );

      // Continue receiving GPS updates.
      startLocationWatch();
    } catch (err) {
      console.error("Unable to start tracking:", err);

      const message =
        err instanceof GeolocationPositionError
          ? err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Allow location access in your browser."
            : "Could not access your GPS location. Please try again."
          : err instanceof Error
            ? err.message
            : "Unable to start tracking.";

      setError(message);
      activeRef.current = false;
      setLocationEnabled(false);
    } finally {
      setStarting(false);
    }
  };

  const markArrived = async () => {
    if (!id) return;

    setError("");

    try {
      await api.patch(`/bookings/provider/${id}/tracking/arrived`);

      stopLocationWatch();
      setStatus("arrived");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update arrival status.",
      );
    }
  };

  const stopTracking = async () => {
    if (!id) return;

    setStopping(true);
    setError("");

    try {
      await api.patch(`/bookings/provider/${id}/tracking/stop`);

      stopLocationWatch();
      setStatus("stopped");
      setCoordinates(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to stop tracking.",
      );
    } finally {
      setStopping(false);
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      activeRef.current = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-emerald-700"
        >
          <ArrowLeft size={17} />
          Back to Home
        </Link>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-emerald-700 p-6 text-white">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Navigation size={24} />
            </div>

            <h1 className="text-2xl font-bold">
              Live Location Sharing
            </h1>

            <p className="mt-2 text-sm text-emerald-100">
              Share your live location with your customer during the service journey.
            </p>
          </div>

          <div className="space-y-6 p-6">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Booking ID
              </p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                {id || "Not available"}
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <MapPin size={21} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">
                  {locationEnabled
                    ? "Location sharing active"
                    : status === "arrived"
                      ? "Arrival marked"
                      : status === "stopped"
                        ? "Location sharing stopped"
                        : "Location sharing disabled"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {locationEnabled
                    ? "Your GPS location is being shared with the customer."
                    : "Enable location sharing when you are ready."}
                </p>
              </div>

              {locationEnabled ? (
                <span className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-emerald-500" />
              ) : (
                <span className="h-3 w-3 shrink-0 rounded-full bg-slate-300" />
              )}
            </div>

            {coordinates && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 size={17} />
                  Latest GPS coordinates sent
                </div>

                <p className="mt-2 text-xs text-emerald-700">
                  Latitude: {coordinates.latitude.toFixed(6)}
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  Longitude: {coordinates.longitude.toFixed(6)}
                </p>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-3">
              {!locationEnabled && status !== "arrived" && (
                <button
                  type="button"
                  onClick={startTracking}
                  disabled={starting || !id}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Navigation size={18} />
                  {starting ? "Enabling GPS..." : "Enable Location & Start Tracking"}
                </button>
              )}

              {locationEnabled && (
                <>
                  <button
                    type="button"
                    onClick={markArrived}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 font-semibold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    <CheckCircle2 size={18} />
                    Mark as Arrived
                  </button>

                  <button
                    type="button"
                    onClick={stopTracking}
                    disabled={stopping}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-5 py-3.5 font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    <Power size={18} />
                    {stopping ? "Stopping..." : "Stop Location Sharing"}
                  </button>
                </>
              )}

              {status === "arrived" && (
                <div className="rounded-xl bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-800">
                  You have marked yourself as arrived.
                </div>
              )}

              {status === "stopped" && (
                <button
                  type="button"
                  onClick={startTracking}
                  disabled={starting}
                  className="w-full rounded-xl bg-emerald-700 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  {starting ? "Starting..." : "Start Tracking Again"}
                </button>
              )}
            </div>

            <p className="text-center text-xs leading-5 text-slate-500">
              Keep this page open while sharing your location. Live tracking
              requires GPS permission and an active internet connection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
