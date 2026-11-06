
import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CalendarCheck,
  Megaphone,
  Check,
  CheckCheck,
  Trash2,
  ArrowRight,
  RefreshCw,
  BellRing,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { api } from "../api";
import type { Notification } from "../api";

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/notifications");

      setNotifications(
        Array.isArray(response.data?.notifications)
          ? response.data.notifications
          : []
      );

      setUnreadCount(
        Number(response.data?.unreadCount || 0)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    setBusyId(id);

    try {
      await api.patch(`/notifications/${id}/read`);

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === id
            ? { ...item, isRead: true }
            : item
        )
      );

      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Unable to update notification."
      );
    } finally {
      setBusyId(null);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    setMarkingAll(true);

    try {
      await api.patch("/notifications/read-all");

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          isRead: true,
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Unable to update notifications."
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (id: string) => {
    setBusyId(id);

    try {
      await api.delete(`/notifications/${id}`);

      const deleted = notifications.find(
        (item) => item._id === id
      );

      setNotifications((previous) =>
        previous.filter((item) => item._id !== id)
      );

      if (deleted && !deleted.isRead) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Unable to delete notification."
      );
    } finally {
      setBusyId(null);
    }
  };

  const openNotification = async (item: Notification) => {
    if (!item.isRead) {
      await markAsRead(item._id);
    }

    if (item.data?.bookingId) {
      navigate("/my-bookings");
    }
  };

  const formatDate = (date: string) => {
    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return "";
    }

    return value.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getNotificationIcon = (type: string) => {
    if (type === "booking") {
      return <CalendarCheck size={20} />;
    }

    if (type === "announcement") {
      return <Megaphone size={20} />;
    }

    return <Bell size={20} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 pt-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <BellRing size={16} />
              STAY UPDATED
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Notifications
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              All your booking updates and announcements in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || markingAll}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 sm:self-center"
          >
            <CheckCheck size={17} />
            {markingAll ? "Updating..." : "Mark all as read"}
          </button>
        </div>

        {/* Summary */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">
              Total notifications
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {notifications.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">
              Unread notifications
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-800">
              {unreadCount}
            </p>
          </div>
        </div>

        {/* Notification list */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Recent activity
            </h2>

            <button
              type="button"
              onClick={() => void fetchNotifications()}
              disabled={loading}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-700 disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
              <p className="text-sm text-slate-500">
                Loading notifications...
              </p>
            </div>
          ) : error ? (
            <div className="px-6 py-16 text-center">
              <p className="font-medium text-rose-600">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void fetchNotifications()}
                className="mt-4 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Try again
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Bell size={28} />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                No notifications yet
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                When you book a service or receive an announcement,
                you'll see it here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((item) => (
                <div
                  key={item._id}
                  className={`group flex gap-3 p-4 transition hover:bg-slate-50 sm:gap-4 sm:p-5 ${
                    !item.isRead ? "bg-emerald-50/40" : ""
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      item.type === "booking"
                        ? "bg-blue-50 text-blue-600"
                        : item.type === "announcement"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </h3>

                      {!item.isRead && (
                        <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      )}
                    </div>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {item.body}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      {formatDate(item.createdAt)}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {item.data?.bookingId && (
                        <button
                          type="button"
                          onClick={() => void openNotification(item)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          View booking
                          <ArrowRight size={13} />
                        </button>
                      )}

                      {!item.isRead && (
                        <button
                          type="button"
                          disabled={busyId === item._id}
                          onClick={() => void markAsRead(item._id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-emerald-700 disabled:opacity-50"
                        >
                          <Check size={13} />
                          Mark as read
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busyId === item._id}
                        onClick={() =>
                          void deleteNotification(item._id)
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-rose-600 disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          You're viewing your latest notifications.
        </p>
      </div>
    </div>
  );
}
