
import { useEffect, useState } from "react";
import { Menu, X, UserRound, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, type User } from "../api";

type NavLink = {
  label: string;
  target: string;
  fallback?: string;
};

type NavbarProps = {
  user: User | null;
  onOpenLogin?: () => void;
  onLogout?: () => void;
};

const navLinks: NavLink[] = [
  { label: "About Us", target: "about", fallback: "/about" },
  { label: "Services", target: "services", fallback: "/services" },
  {
    label: "Become a Provider",
    target: "provider",
    fallback: "/become-a-provider",
  },
];

export default function Navbar({ user }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState("Home");
  const [unreadCount, setUnreadCount] = useState(0);

  const navigate = useNavigate();

  // ========================================
  // FETCH UNREAD NOTIFICATION COUNT
  // ========================================

  useEffect(() => {
    if (!user || user.role !== "customer") {
      setUnreadCount(0);
      return;
    }

    let isMounted = true;

    const fetchUnreadCount = async () => {
      try {
        const response = await api.get("/notifications/unread-count");

        if (isMounted) {
          setUnreadCount(response.data.unreadCount || 0);
        }
      } catch (error) {
        console.error("Failed to fetch unread notifications:", error);
      }
    };

    fetchUnreadCount();

    const interval = window.setInterval(fetchUnreadCount, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [user]);

  // ========================================
  // NAVIGATION
  // ========================================

  const goToLogin = () => {
    setMobileMenuOpen(false);
    navigate("/login");
  };

  const navigateTo = (
    label: string,
    target: string,
    fallback?: string
  ) => {
    setActiveLink(label);
    setMobileMenuOpen(false);

    if (target === "home") {
      if (window.location.pathname !== "/") {
        navigate("/#home");
        return;
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.replaceState(null, "", "#home");
      return;
    }

    if (window.location.pathname !== "/") {
      navigate(fallback || `/#${target}`);
      return;
    }

    const section = document.getElementById(target);

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      window.history.replaceState(null, "", `#${target}`);
      return;
    }

    if (fallback) navigate(fallback);
  };

  // ========================================
  // ACTIVE SECTION DETECTION
  // ========================================

  useEffect(() => {
    const sectionMap = [
      { id: "services", label: "Services" },
      { id: "professionals", label: "Elite Network" },
      { id: "about", label: "How it Works" },
      { id: "provider", label: "Become a Provider" },
    ];

    const updateActiveSection = () => {
      let current = "Home";

      for (const item of sectionMap) {
        const section = document.getElementById(item.id);

        if (section && section.getBoundingClientRect().top <= 150) {
          current = item.label;
        }
      }

      setActiveLink(current);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("scroll", updateActiveSection, {
      passive: true,
    });

    window.addEventListener("keydown", handleKeyDown);

    updateActiveSection();

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // ========================================
  // PROFILE & NOTIFICATION NAVIGATION
  // ========================================

  const goToProfile = () => {
    setMobileMenuOpen(false);
    navigate("/profile");
  };

  const goToNotifications = () => {
    setMobileMenuOpen(false);
    navigate("/notifications");
  };

  // ========================================
  // PROFILE BUTTON
  // ========================================

  const ProfileButton = ({ mobile = false }: { mobile?: boolean }) => (
    <button
      type="button"
      onClick={goToProfile}
      aria-label="View your profile"
      title={user?.name || "My Profile"}
      className={
        mobile
          ? "flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
          : "flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
      }
    >
      <UserRound size={19} />
      {mobile && <span>My Profile</span>}
    </button>
  );

  // ========================================
  // NOTIFICATION BUTTON
  // ========================================

  const NotificationButton = ({
    mobile = false,
  }: {
    mobile?: boolean;
  }) => (
    <button
      type="button"
      onClick={goToNotifications}
      aria-label={
        unreadCount > 0
          ? `${unreadCount} unread notifications`
          : "View notifications"
      }
      title="Notifications"
      className={
        mobile
          ? "relative flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50"
          : "relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
      }
    >
      <Bell size={19} />

      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}

      {mobile && <span>Notifications</span>}
    </button>
  );

  // ========================================
  // NAVBAR UI
  // ========================================

  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">

        {/* Logo */}
        <a
          href="/#home"
          onClick={(event) => {
            event.preventDefault();
            navigateTo("Home", "home");
          }}
          aria-label="Credence home"
          className="flex shrink-0 items-center"
        >
          <img
            src="/logo2.png"
            alt="Credence"
            className="h-10 w-auto object-contain sm:h-12"
          />
        </a>

        {/* Desktop navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 text-[13px] font-medium tracking-normal text-slate-700 md:flex lg:gap-9"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={`#${link.target}`}
              onClick={(event) => {
                event.preventDefault();
                navigateTo(link.label, link.target, link.fallback);
              }}
              aria-current={
                activeLink === link.label ? "location" : undefined
              }
              className={`relative py-2 hover:text-emerald-700 ${
                activeLink === link.label ? "text-emerald-700" : ""
              }`}
            >
              {link.label}

              {activeLink === link.label && (
                <span className="absolute -bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-emerald-600" />
              )}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2.5 md:flex">
          {user ? (
            <>
              {user.role === "customer" && <NotificationButton />}
              <ProfileButton />
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={goToLogin}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-emerald-200 hover:bg-emerald-50"
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() =>
                  navigateTo("Get App", "app", "/#app")
                }
                className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 active:scale-[0.98]"
              >
                Get App
              </button>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label={
            mobileMenuOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 md:hidden"
        >
          {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-slate-100 bg-white px-4 pb-4 pt-3 shadow-lg md:hidden sm:px-6"
        >
          <nav
            aria-label="Mobile navigation"
            className="flex flex-col gap-1"
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={`#${link.target}`}
                onClick={(event) => {
                  event.preventDefault();
                  navigateTo(link.label, link.target, link.fallback);
                }}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-emerald-50 hover:text-emerald-700 ${
                  activeLink === link.label
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-800"
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Mobile actions */}
          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
            {user ? (
              <>
                {user.role === "customer" && <NotificationButton mobile />}
                <ProfileButton mobile />
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={goToLogin}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigateTo("Get App", "app", "/#app")
                  }
                  className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Get App
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
