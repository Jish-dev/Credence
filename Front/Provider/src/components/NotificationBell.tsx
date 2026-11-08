
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck, Loader2, X } from "lucide-react";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

interface NotificationItem {
  _id: string;
  title: string;
  body?: string;
  type?: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt?: string;
}

function extractNotifications(payload: any): NotificationItem[] {
  const candidates = [
    payload?.notifications,
    payload?.data?.notifications,
    payload?.data,
    payload,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function extractUnreadCount(payload: any): number {
  return Number(
    payload?.unreadCount ??
    payload?.count ??
    payload?.data?.unreadCount ??
    payload?.data?.count ??
    payload?.data?.unread ??
    0
  ) || 0;
}

function timeAgo(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  );

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [alerts, setAlerts] = useState<NotificationItem[]>([]);

  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [listResponse, countResponse] = await Promise.all([
        api.get("/notifications"),
        api.get("/notifications/unread-count"),
      ]);

      setNotifications(extractNotifications(listResponse.data));
      setUnreadCount(extractUnreadCount(countResponse.data));
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Socket connection and real-time notification listener
  useEffect(() => {
    const token = localStorage.getItem("provider_token");

    if (!token) return;

    const socket = connectSocket(token);

    const handleNewNotification = (notification: NotificationItem) => {
      setNotifications((current) => [
        notification,
        ...current.filter((item) => item._id !== notification._id),
      ]);

      if (!notification.isRead) {
        setUnreadCount((count) => count + 1);
      }

      // Show popup alert
      setAlerts((current) => [
        notification,
        ...current.filter((item) => item._id !== notification._id),
      ].slice(0, 3));
    };

    socket.on("notification:new", handleNewNotification);

    void fetchNotifications();

    return () => {
      socket.off("notification:new", handleNewNotification);
      disconnectSocket();
    };
  }, [fetchNotifications]);

  // Automatically close popup alerts after 5 seconds
  useEffect(() => {
    if (alerts.length === 0) return;

    const timers = alerts.map((alert) =>
      window.setTimeout(() => {
        setAlerts((current) =>
          current.filter((item) => item._id !== alert._id)
        );
      }, 5000)
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [alerts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Mark one notification as read
  const markOneAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);

      setNotifications((current) =>
        current.map((item) =>
          item._id === id ? { ...item, isRead: true } : item
        )
      );

      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to mark as read.");
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");

      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true }))
      );

      setUnreadCount(0);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to mark all as read.");
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);

      const deleted = notifications.find((item) => item._id === id);

      setNotifications((current) =>
        current.filter((item) => item._id !== id)
      );

      if (deleted && !deleted.isRead) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to delete notification.");
    }
  };

  return (
    <>
      {/* ==============================
          REAL-TIME POPUP ALERTS
      ============================== */}

      <div className="fixed right-4 top-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
        {alerts.map((alert) => (
          <div
            key={alert._id}
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-[#DCE9E5] bg-white p-4 text-[#14211F] shadow-[0_12px_40px_rgba(15,45,38,0.18)]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E8F4F0] text-[#0F766E]">
              <Bell size={18} />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setAlerts((current) =>
                  current.filter((item) => item._id !== alert._id)
                );
                void fetchNotifications();
              }}
              className="min-w-0 flex-1 text-left"
              aria-label={`Open notification: ${alert.title}`}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F766E]">
                New notification
              </p>

              <p className="mt-1 text-sm font-bold">
                {alert.title}
              </p>

              {alert.body && (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#667570]">
                  {alert.body}
                </p>
              )}

              <p className="mt-2 text-[10px] text-[#82918C]">
                Disappears in 5 seconds
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setAlerts((current) =>
                  current.filter((item) => item._id !== alert._id)
                )
              }
              aria-label="Dismiss alert"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* ==============================
          NOTIFICATION BELL
      ============================== */}

      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => {
            setIsOpen((open) => !open);
            if (!isOpen) void fetchNotifications();
          }}
          aria-label={`Notifications, ${unreadCount} unread`}
          aria-expanded={isOpen}
          className="relative grid h-11 w-11 place-items-center rounded-full border border-[#E4EAE8] bg-white text-slate-600 transition hover:bg-[#E9F1EF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0F766E]/25"
        >
          <Bell size={18} />

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* ==============================
            NOTIFICATION DROPDOWN
        ============================== */}

        {isOpen && (
          <div className="absolute right-0 z-50 mt-3 w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E4EAE8] bg-white text-[#14211F] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E4EAE8] px-4 py-3.5">
              <div>
                <h3 className="text-sm font-bold">Notifications</h3>
                <p className="mt-0.5 text-xs text-[#667570]">
                  {unreadCount} unread
                </p>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void markAllAsRead()}
                    title="Mark all as read"
                    className="grid h-9 w-9 place-items-center rounded-lg text-[#0F766E] hover:bg-[#E9F1EF]"
                  >
                    <CheckCheck size={17} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications"
                  className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {error && (
              <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}

            <div className="max-h-[420px] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-[#667570]">
                  <Loader2 size={16} className="animate-spin" />
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#E9F1EF] text-[#0F766E]">
                    <Bell size={19} />
                  </div>

                  <p className="mt-3 text-sm font-semibold">
                    You're all caught up
                  </p>

                  <p className="mt-1 text-xs text-[#667570]">
                    New booking updates will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item._id}
                    className={`group border-b border-[#EEF2F0] px-4 py-3.5 last:border-b-0 ${
                      item.isRead ? "bg-white" : "bg-[#F0F8F6]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          item.isRead ? "bg-transparent" : "bg-[#0F766E]"
                        }`}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold">
                            {item.title}
                          </p>

                          <span className="shrink-0 text-[10px] text-[#82918C]">
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>

                        {item.body && (
                          <p className="mt-1 text-xs leading-5 text-[#667570]">
                            {item.body}
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-3">
                          {!item.isRead && (
                            <button
                              type="button"
                              onClick={() => void markOneAsRead(item._id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F766E] hover:underline"
                            >
                              <Check size={13} />
                              Mark as read
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void deleteNotification(item._id)}
                            className="text-[11px] font-medium text-slate-400 hover:text-rose-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[#E4EAE8] bg-[#F7FAF9] px-4 py-2">
              <button
                type="button"
                onClick={() => void fetchNotifications()}
                className="w-full py-1 text-xs font-semibold text-[#0F766E] hover:underline"
              >
                Refresh notifications
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
