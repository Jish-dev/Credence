import { useEffect, useRef, useState } from "react";
import { Bell, CalendarCheck, ChevronDown, LogOut, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { api, type User } from "../api";

type NavLink = {
  label: string;
  /** Section id on the home page */
  target: string;
  /** Page to open when we are not on the home page */
  fallback?: string;
  /** If set, the link always opens this page instead of scrolling to a section */
  route?: string;
};

type NavbarProps = {
  user: User | null;
  onOpenLogin?: () => void;
  onLogout?: () => void;
};

const navLinks: NavLink[] = [
  { label: "About Us", target: "about", fallback: "/about" },
  // Always opens the /services page
  {
    label: "Services",
    target: "services",
    fallback: "/service",
    route: "/service",
  },
  {
    label: "Become a Provider",
    target: "provider",
    fallback: "/become-a-provider",
  },
];

const easeOut = [0.22, 1, 0.36, 1] as const;

export default function Navbar({ user, onLogout }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [homeSection, setHomeSection] = useState("Home");
  const [unreadCount, setUnreadCount] = useState(0);

  const profileRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const { pathname } = useLocation();

  // ----------------------------------------
  // Active link: by route on other pages, by scroll position on the home page
  // ----------------------------------------

  const routeActive = navLinks.find((link) => {
    const page = link.route || link.fallback;
    return page && (pathname === page || pathname.startsWith(`${page}/`));
  })?.label;

  const activeLink = pathname === "/" ? homeSection : routeActive ?? "";

  // Unread notifications
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

  // Close the profile dropdown on route change
  useEffect(() => {
    setProfileOpen(false);
  }, [pathname]);

  // Close the profile dropdown on outside click or Escape
  useEffect(() => {
    if (!profileOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  // Scroll spy (home page only) + Escape to close the menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    if (pathname !== "/") {
      return () => window.removeEventListener("keydown", handleKeyDown);
    }

    // Services is its own page now, so only these sections are tracked.
    const sectionMap = [
      { id: "about", label: "About Us" },
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

      setHomeSection(current);
    };

    window.addEventListener("scroll", updateActiveSection, { passive: true });
    updateActiveSection();

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pathname]);

  // ----------------------------------------
  // Navigation
  // ----------------------------------------

  const goToLogin = () => {
    setMobileMenuOpen(false);
    navigate("/login");
  };

  const goToProfile = () => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
    navigate("/profile");
  };

  const goToBookings = () => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
    navigate("/my-bookings");
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
    onLogout?.();
    navigate("/");
  };

  const goToNotifications = () => {
    setMobileMenuOpen(false);
    navigate("/notifications");
  };

  const navigateTo = (link: {
    target: string;
    fallback?: string;
    route?: string;
  }) => {
    const { target, fallback, route } = link;
    setMobileMenuOpen(false);

    // Page links (Services) always open their page.
    if (route) {
      if (pathname !== route) navigate(route);
      window.scrollTo({ top: 0 });
      return;
    }

    if (target === "home") {
      if (pathname !== "/") {
        navigate("/#home");
        return;
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.replaceState(null, "", "#home");
      return;
    }

    if (pathname !== "/") {
      navigate(fallback || `/#${target}`);
      return;
    }

    const section = document.getElementById(target);

    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#${target}`);
      return;
    }

    if (fallback) navigate(fallback);
  };

  const goToApp = () => navigateTo({ target: "app", fallback: "/#app" });

  // ----------------------------------------
  // Small pieces
  // ----------------------------------------

  const initial = (user?.name || "U").charAt(0).toUpperCase();
  const isCustomer = user?.role === "customer";

  const NotificationButton = ({ mobile = false }: { mobile?: boolean }) => (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={goToNotifications}
      aria-label={
        unreadCount > 0
          ? `${unreadCount} unread notifications`
          : "View notifications"
      }
      className={
        mobile
          ? "flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-emerald-700 hover:bg-emerald-50"
          : "relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:border-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      }
    >
      <span className="relative">
        <Bell size={19} aria-hidden="true" />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </span>
      {mobile && <span>Notifications</span>}
    </motion.button>
  );

  // Desktop profile dropdown (rendered inline, not as a component,
  // so its open state is never reset by a re-render)
  const profileDropdown = (
    <div ref={profileRef} className="relative">
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => setProfileOpen((open) => !open)}
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={profileOpen}
        title={user?.name || "My account"}
        className="flex h-10 items-center gap-1.5 rounded-full bg-emerald-100 pl-1 pr-2.5 text-emerald-900 transition-colors hover:bg-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-800 text-sm font-bold text-white">
          {initial}
        </span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: profileOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: easeOut }}
          className="flex"
        >
          <ChevronDown size={16} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {profileOpen && (
          <motion.div
            role="menu"
            aria-label="Account menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: easeOut }}
            className="absolute right-0 top-[calc(100%+10px)] w-60 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
          >
            {/* Signed-in user */}
            <div className="border-b border-slate-100 bg-emerald-50/60 px-4 py-3">
              <p className="truncate text-sm font-extrabold text-slate-900">
                {user?.name || "My account"}
              </p>
              {user?.email && (
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {user.email}
                </p>
              )}
            </div>

            <div className="p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={goToProfile}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
              >
                <UserRound size={17} aria-hidden="true" />
                My Profile
              </button>

              {isCustomer && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={goToBookings}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
                >
                  <CalendarCheck size={17} aria-hidden="true" />
                  My Bookings
                </button>
              )}
            </div>

            <div className="border-t border-slate-100 p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
              >
                <LogOut size={17} aria-hidden="true" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ----------------------------------------
  // UI
  // ----------------------------------------

  return (
    <MotionConfig reducedMotion="user">
      <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-slate-100 bg-white/75 backdrop-blur">
        <div className="mx-auto flex h-[78px] max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
          {/* Logo */}
          <a
            href="/#home"
            onClick={(event) => {
              event.preventDefault();
              navigateTo({ target: "home" });
            }}
            aria-label="Credence home"
            className="flex shrink-0 items-center"
          >
            <img
              src="/logo2.png"
              alt="Credence"
              className="h-12 w-auto object-contain sm:h-18"
            />
          </a>

          {/* Desktop navigation */}
          <nav
            aria-label="Main navigation"
            className="ml-auto hidden h-full items-center gap-1 md:flex lg:gap-3"
          >
            {navLinks.map((link) => {
              const active = activeLink === link.label;

              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => navigateTo(link)}
                  aria-current={
                    active ? (link.route ? "page" : "location") : undefined
                  }
                  className={`relative flex h-full items-center px-4 text-ls font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-emerald-700 ${
                    active
                      ? "text-emerald-800"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-4 -bottom-px h-0.5 bg-emerald-700"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                {isCustomer && <NotificationButton />}
                {profileDropdown}
              </>
            ) : (
              <>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={goToLogin}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-800 transition-colors hover:border-emerald-700 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  Sign in
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={goToApp}
                  className="rounded-lg bg-emerald-800 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  Get the app
                </motion.button>
              </>
            )}
          </div>

          {/* Mobile menu toggle (animated two-line icon) */}
          <button
            type="button"
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 transition-colors hover:border-emerald-700 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 md:hidden"
          >
            <motion.span
              aria-hidden="true"
              animate={{
                y: mobileMenuOpen ? 0 : -4,
                rotate: mobileMenuOpen ? 45 : 0,
              }}
              transition={{ duration: 0.25, ease: easeOut }}
              className="absolute h-0.5 w-5 rounded bg-slate-800"
            />
            <motion.span
              aria-hidden="true"
              animate={{
                y: mobileMenuOpen ? 0 : 4,
                rotate: mobileMenuOpen ? -45 : 0,
              }}
              transition={{ duration: 0.25, ease: easeOut }}
              className="absolute h-0.5 w-5 rounded bg-slate-800"
            />
          </button>
        </div>

        {/* Mobile navigation */}
        <AnimatePresence initial={false}>
          {mobileMenuOpen && (
            <motion.div
              id="mobile-navigation"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: easeOut }}
              className="overflow-hidden border-t border-slate-200 bg-white md:hidden"
            >
              <div className="px-5 pb-6 pt-3 sm:px-8">
                <nav aria-label="Mobile navigation" className="flex flex-col">
                  {[
                    { label: "Home", target: "home" } as NavLink,
                    ...navLinks,
                  ].map((link, index) => {
                    const active = activeLink === link.label;

                    return (
                      <motion.button
                        key={link.label}
                        type="button"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: 0.05 + index * 0.05,
                          ease: easeOut,
                        }}
                        onClick={() => navigateTo(link)}
                        aria-current={
                          active ? (link.route ? "page" : "location") : undefined
                        }
                        className={`border-b border-slate-100 py-4 text-left text-lg font-semibold transition-colors ${
                          active
                            ? "text-emerald-800"
                            : "text-slate-800 hover:text-emerald-800"
                        }`}
                      >
                        {link.label}
                      </motion.button>
                    );
                  })}
                </nav>

                {user ? (
                  <div className="mt-5 space-y-3">
                    {/* Signed-in user */}
                    <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-sm font-bold text-white">
                        {initial}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">
                          {user.name || "My account"}
                        </p>
                        {user.email && (
                          <p className="truncate text-xs text-slate-500">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {isCustomer && <NotificationButton mobile />}

                    <button
                      type="button"
                      onClick={goToProfile}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-emerald-700 hover:bg-emerald-50"
                    >
                      <UserRound size={17} aria-hidden="true" />
                      My Profile
                    </button>

                    {isCustomer && (
                      <button
                        type="button"
                        onClick={goToBookings}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-emerald-700 hover:bg-emerald-50"
                      >
                        <CalendarCheck size={17} aria-hidden="true" />
                        My Bookings
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                    >
                      <LogOut size={17} aria-hidden="true" />
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={goToLogin}
                      className="w-full rounded-lg border border-slate-300 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-emerald-700 hover:bg-emerald-50"
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={goToApp}
                      className="w-full rounded-lg bg-emerald-800 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
                    >
                      Get the app
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </MotionConfig>
  );
}