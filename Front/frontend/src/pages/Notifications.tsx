import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  CalendarCheck2,
  Check,
  CheckCheck,
  ChevronRight,
  Info,
  Megaphone,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { api } from "../api";
import type { Notification } from "../api";

// ========================================
// HELPERS
// ========================================

function getErrorMessage(error: unknown, fallback: string) {
  const apiMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;

  if (apiMessage) return apiMessage;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayLabel(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Earlier";

  const days = Math.round(
    (startOfDay(new Date()).getTime() - startOfDay(date).getTime()) /
      86_400_000
  );

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This Week";
  return "Earlier";
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function getTypeMeta(type: string) {
  switch (type) {
    case "booking":
      return {
        label: "Booking",
        Icon: CalendarCheck2,
        badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
      };
    case "announcement":
      return {
        label: "Announcement",
        Icon: Megaphone,
        badgeClass: "bg-amber-50 text-amber-700 ring-amber-600/20",
      };
    default:
      return {
        label: "Update",
        Icon: Info,
        badgeClass: "bg-stone-100 text-stone-700 ring-stone-600/20",
      };
  }
}

const groupOrder = ["Today", "Yesterday", "This Week", "Earlier"];

type Filter = "all" | "unread";

// ========================================
// PAGE
// ========================================

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

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
      setUnreadCount(Number(response.data?.unreadCount || 0));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load notifications."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // ----------------------------------------
  // Actions
  // ----------------------------------------

  const markAsRead = async (id: string) => {
    setBusyId(id);
    setActionError("");

    try {
      await api.patch(`/notifications/${id}/read`);

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === id ? { ...item, isRead: true } : item
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setActionError(getErrorMessage(err, "Unable to update notification."));
    } finally {
      setBusyId(null);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    setMarkingAll(true);
    setActionError("");

    try {
      await api.patch("/notifications/read-all");

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      setActionError(getErrorMessage(err, "Unable to update notifications."));
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (id: string) => {
    setBusyId(id);
    setActionError("");

    try {
      await api.delete(`/notifications/${id}`);

      const deleted = notifications.find((item) => item._id === id);

      setNotifications((previous) =>
        previous.filter((item) => item._id !== id)
      );

      if (deleted && !deleted.isRead) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (err) {
      setActionError(getErrorMessage(err, "Unable to delete notification."));
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

  // ----------------------------------------
  // Derived
  // ----------------------------------------

  const visible = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((item) => !item.isRead)
        : notifications,
    [notifications, filter]
  );

  const groups = useMemo(() => {
    const map = new Map<string, Notification[]>();

    for (const item of visible) {
      const label = dayLabel(item.createdAt);
      map.set(label, [...(map.get(label) ?? []), item]);
    }

    return groupOrder
      .filter((label) => map.has(label))
      .map((label) => ({ label, items: map.get(label)! }));
  }, [visible]);

  // ----------------------------------------
  // UI
  // ----------------------------------------

  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-100/90 pb-24 pt-28 text-stone-900">
      {/* Subtle architectural dot pattern + top wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#d6d3d1_1px,transparent_1px)] [background-size:20px_20px] opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-emerald-950/[0.04] via-stone-100/40 to-transparent"
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* LEFT SIDEBAR: Controls & Summary */}
          <aside className="lg:sticky lg:top-28 lg:col-span-4">
            <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-900 text-white shadow-xs">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                    Notifications
                  </h1>
                  <p className="text-sm text-stone-500">Activity & updates</p>
                </div>
              </div>

              {/* Status Banner */}
              <div className="mt-6 rounded-xl border border-stone-200/70 bg-stone-50 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-stone-600">
                    Unread alerts
                  </span>
                  <span className="text-2xl font-bold text-stone-900">
                    {unreadCount}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {unreadCount > 0
                    ? `${notifications.length} total notifications in your inbox`
                    : "You're completely caught up."}
                </p>
              </div>

              {/* Vertical Navigation Filters */}
              <nav
                role="tablist"
                aria-label="Filter notifications"
                className="mt-6 space-y-1.5"
              >
                {(
                  [
                    { id: "all", label: "All notifications", count: notifications.length },
                    { id: "unread", label: "Unread only", count: unreadCount },
                  ] as const
                ).map((tab) => {
                  const active = filter === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setFilter(tab.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                        active
                          ? "bg-stone-900 text-white shadow-xs"
                          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-stone-200/80 text-stone-700"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Bulk Action */}
              <div className="mt-6 border-t border-stone-200/80 pt-5">
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0 || markingAll}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <CheckCheck className="h-4 w-4 text-emerald-700" />
                  {markingAll ? "Marking all…" : "Mark all as read"}
                </button>
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN: Notification Stream */}
          <section className="lg:col-span-8">
            {actionError && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-xs"
              >
                {actionError}
              </div>
            )}

            {loading ? (
              <div className="space-y-4" aria-busy="true">
                {[0, 1, 2, 3].map((row) => (
                  <div
                    key={row}
                    className="animate-pulse rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-11 w-11 shrink-0 rounded-xl bg-stone-200" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 w-1/3 rounded bg-stone-200" />
                        <div className="h-3.5 w-4/5 rounded bg-stone-200/70" />
                        <div className="h-3 w-1/4 rounded bg-stone-200/60" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-sm">
                <p className="text-base font-semibold text-stone-800">{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchNotifications()}
                  className="mt-4 inline-flex items-center rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800"
                >
                  Try again
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-2xl border border-stone-200/90 bg-white px-6 py-20 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-500">
                  {filter === "unread" ? (
                    <Sparkles className="h-6 w-6 text-emerald-700" />
                  ) : (
                    <BellOff className="h-6 w-6" />
                  )}
                </div>
                <h2 className="mt-5 text-lg font-bold text-stone-900">
                  {filter === "unread"
                    ? "Zero unread notifications"
                    : "No notifications yet"}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-stone-500">
                  {filter === "unread"
                    ? "You've gone through all your recent alerts. Switch to All notifications to browse history."
                    : "Booking confirmations, schedule updates, and announcements will appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {groups.map((group) => (
                  <div key={group.label}>
                    <div className="mb-3 flex items-center gap-3 px-1">
                      <h2 className="text-sm font-bold tracking-wide text-stone-600">
                        {group.label}
                      </h2>
                      <div className="h-px flex-1 bg-stone-300/70" />
                    </div>

                    <ul className="space-y-3">
                      {group.items.map((item) => {
                        const busy = busyId === item._id;
                        const hasLink = Boolean(item.data?.bookingId);
                        const clickable = !item.isRead || hasLink;
                        const { label, Icon, badgeClass } = getTypeMeta(
                          item.type
                        );

                        return (
                          <li
                            key={item._id}
                            className={`group relative flex items-start gap-4 rounded-2xl border p-5 transition ${
                              item.isRead
                                ? "border-stone-200/80 bg-white/80 hover:bg-white"
                                : "border-emerald-600/30 bg-white shadow-sm"
                            }`}
                          >
                            {/* Category Icon */}
                            <div
                              className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${badgeClass}`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>

                            {/* Content */}
                            <button
                              type="button"
                              onClick={() => void openNotification(item)}
                              disabled={!clickable}
                              className="min-w-0 flex-1 text-left disabled:cursor-default"
                            >
                              <div className="flex items-center gap-2.5">
                                {!item.isRead && (
                                  <span
                                    aria-label="Unread"
                                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600"
                                  />
                                )}
                                <span
                                  className={`text-base leading-snug ${
                                    item.isRead
                                      ? "font-medium text-stone-700"
                                      : "font-bold text-stone-900"
                                  }`}
                                >
                                  {item.title}
                                </span>
                              </div>

                              <p className="mt-1.5 text-[15px] leading-relaxed text-stone-600">
                                {item.body}
                              </p>

                              <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-medium text-stone-500">
                                <span>{label}</span>
                                <span aria-hidden="true">•</span>
                                <time dateTime={item.createdAt}>
                                  {timeAgo(item.createdAt)}
                                </time>
                                {hasLink && (
                                  <>
                                    <span aria-hidden="true">•</span>
                                    <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 group-hover:underline">
                                      View booking
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </span>
                                  </>
                                )}
                              </div>
                            </button>

                            {/* Actions */}
                            <div className="flex shrink-0 items-center gap-1 self-start">
                              {!item.isRead && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void markAsRead(item._id)}
                                  aria-label="Mark as read"
                                  title="Mark as read"
                                  className="rounded-lg p-2 text-stone-500 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void deleteNotification(item._id)}
                                aria-label="Delete notification"
                                title="Delete"
                                className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}