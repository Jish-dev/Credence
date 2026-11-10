import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

type Service = { name: string; image: string };

type ServiceGroup = {
  title: string;
  services: Service[];
};

const easeOut = [0.22, 1, 0.36, 1] as const;

const serviceGroups: ServiceGroup[] = [
  {
    title: "Home Maintenance",
    services: [
      { name: "Plumbing", image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=700&q=85" },
      { name: "Electrical Works", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=700&q=85" },
      { name: "AC Installation & Repair", image: "https://images.unsplash.com/photo-1631545806609-7e9b5f4f3c1b?auto=format&fit=crop&w=700&q=85" },
      { name: "Washing Machine Repair", image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=700&q=85" },
      { name: "Refrigerator Repair", image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=700&q=85" },
      { name: "CCTV Installation", image: "https://images.unsplash.com/photo-1557597774-9d273605dd8d?auto=format&fit=crop&w=700&q=85" },
      { name: "Painting", image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=700&q=85" },
      { name: "Carpentry", image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=700&q=85" },
      { name: "Home Cleaning", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=700&q=85" },
      { name: "Pest Control", image: "https://images.unsplash.com/photo-1635321593217-40050ad13c74?auto=format&fit=crop&w=700&q=85" },
    ],
  },
  {
    title: "Home Improvement",
    services: [
      { name: "Interior Design", image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=700&q=85" },
      { name: "Home Renovation", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=700&q=85" },
      { name: "Tile & Flooring Works", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=700&q=85" },
      { name: "Waterproofing", image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=700&q=85" },
      { name: "Roofing Works", image: "https://images.unsplash.com/photo-1635424710928-4d4f3f4c7d4f?auto=format&fit=crop&w=700&q=85" },
      { name: "Glass & Aluminium Works", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=700&q=85" },
      { name: "False Ceiling", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=700&q=85" },
    ],
  },
  {
    title: "Vehicle Services",
    services: [
      { name: "Car Repair", image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=700&q=85" },
      { name: "Bike Repair", image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=700&q=85" },
      { name: "Car Washing & Detailing", image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=700&q=85" },
      { name: "Roadside Assistance", image: "https://images.unsplash.com/photo-1597404294360-feeeda046e39?auto=format&fit=crop&w=700&q=85" },
    ],
  },
  {
    title: "Personal & Lifestyle",
    services: [
      { name: "Beauty & Salon", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=700&q=85" },
      { name: "Home Nursing", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=85" },
      { name: "Fitness Training", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=700&q=85" },
      { name: "Photography", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=700&q=85" },
      { name: "Event Decoration", image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=700&q=85" },
    ],
  },
  {
    title: "Other Services",
    services: [
      { name: "Computer & Laptop Repair", image: "https://images.unsplash.com/photo-1581092918056-0c4c3a4a4f4f?auto=format&fit=crop&w=700&q=85" },
      { name: "Mobile Repair", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=85" },
      { name: "CCTV & Security Services", image: "https://images.unsplash.com/photo-1557597774-9d273605dd8d?auto=format&fit=crop&w=700&q=85" },
      { name: "Packers & Movers", image: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=700&q=85" },
      { name: "Gardening & Landscaping", image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=700&q=85" },
      { name: "Water Purifier Service", image: "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=700&q=85" },
    ],
  },
];

const ALL = "All services";
const filters = [ALL, ...serviceGroups.map((group) => group.title)];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/ & /g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const tileImageVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.07, transition: { duration: 0.6, ease: easeOut } },
} as const;

function ServiceTile({
  service,
  index,
  onClick,
}: {
  service: Service;
  index: number;
  onClick: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: (index % 4) * 0.07, ease: easeOut }}
    >
      <motion.button
        type="button"
        onClick={onClick}
        initial="rest"
        animate="rest"
        whileHover="hover"
        whileFocus="hover"
        whileTap={{ scale: 0.98 }}
        className="group block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
      >
        <span className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-emerald-100 ring-1 ring-slate-200 transition-shadow group-hover:ring-emerald-700">
          <span className="flex h-full w-full items-center justify-center text-5xl font-semibold text-emerald-800/30">
            {service.name.charAt(0)}
          </span>
          {!imageFailed && (
            <motion.img
              variants={tileImageVariants}
              src={service.image}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </span>

        <span className="mt-3 block text-base font-semibold leading-snug text-slate-900 transition-colors group-hover:text-emerald-800">
          {service.name}
        </span>
      </motion.button>
    </motion.li>
  );
}

export default function Services() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(ALL);
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();

  // Groups after search is applied (category filter comes next)
  const searchedGroups = useMemo(
    () =>
      serviceGroups
        .map((group) => ({
          ...group,
          services: group.services.filter(
            (service) =>
              !query ||
              service.name.toLowerCase().includes(query) ||
              group.title.toLowerCase().includes(query)
          ),
        }))
        .filter((group) => group.services.length > 0),
    [query]
  );

  const visibleGroups = searchedGroups.filter(
    (group) => activeCategory === ALL || group.title === activeCategory
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    let total = 0;
    searchedGroups.forEach((group) => {
      map[group.title] = group.services.length;
      total += group.services.length;
    });
    map[ALL] = total;
    return map;
  }, [searchedGroups]);

  const totalVisible = visibleGroups.reduce(
    (total, group) => total + group.services.length,
    0
  );

  const filteredMode = activeCategory !== ALL || query.length > 0;

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen bg-white text-slate-900 selection:bg-emerald-100">
        {/* Header */}

        <section className="border-b border-emerald-100 bg-emerald-50">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-14 sm:px-8 md:grid-cols-[1fr_.8fr] md:py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOut }}
            >
              <h1 className="max-w-xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Every service,{" "}
                <span className="text-emerald-700">one place.</span>
              </h1>

              <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
                From home repairs to everyday lifestyle help, find trusted
                professionals across Kerala.
              </p>

              <form
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  document
                    .getElementById("services-list")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-8 flex max-w-xl gap-2 rounded-xl border border-slate-200 bg-white p-2 transition-shadow focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20"
              >
                <label htmlFor="service-search" className="sr-only">
                  Search services
                </label>
                <input
                  id="service-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search a service, e.g. plumbing or AC repair"
                  className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.96 }}
                  className="rounded-lg bg-emerald-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
                >
                  Search
                </motion.button>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: easeOut }}
              className="relative hidden h-[280px] md:block"
            >
              <img
                src="/credence-services-hero.png"
                alt="Credence home services professional"
                className="h-full w-full object-contain object-right-bottom"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </motion.div>
          </div>
        </section>

        {/* Services */}

        <section
          id="services-list"
          className="mx-auto max-w-7xl scroll-mt-20 px-5 py-12 sm:px-8 lg:py-16"
        >
          <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-14">
            {/* Category navigation (sticky on desktop) */}
            <nav
              aria-label="Service categories"
              className="lg:sticky lg:top-24 lg:self-start"
            >
              <h2 className="mb-3 hidden text-sm font-semibold text-slate-500 lg:block">
                Categories
              </h2>

              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
                {filters.map((category) => {
                  const active = activeCategory === category;
                  const count = counts[category] ?? 0;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      aria-pressed={active}
                      className={`relative flex shrink-0 items-center justify-between gap-4 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 lg:rounded-lg lg:py-3 ${
                        active
                          ? "text-white"
                          : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="category-highlight"
                          className="absolute inset-0 rounded-full bg-emerald-800 lg:rounded-lg"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 34,
                          }}
                        />
                      )}
                      <span className="relative">{category}</span>
                      <span
                        className={`relative text-xs font-medium ${
                          active ? "text-emerald-100" : "text-slate-400"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Results */}
            <div className="min-w-0">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  How can we help you today?
                </h2>

                <p className="text-sm text-slate-500" aria-live="polite">
                  {filteredMode
                    ? `Showing ${totalVisible} ${
                        totalVisible === 1 ? "service" : "services"
                      }`
                    : `${counts[ALL]} services`}
                  {search && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:decoration-emerald-800"
                      >
                        Clear search
                      </button>
                    </>
                  )}
                </p>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {visibleGroups.length > 0 ? (
                  <motion.div
                    key={`${activeCategory}-${query}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: easeOut }}
                    className="space-y-14"
                  >
                    {visibleGroups.map((group) => (
                      <section key={group.title}>
                        <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-slate-200 pb-3">
                          <h3 className="text-xl font-semibold">
                            {group.title}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {group.services.length}{" "}
                            {group.services.length === 1
                              ? "service"
                              : "services"}
                          </p>
                        </div>

                        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
                          {group.services.map((service, index) => (
                            <ServiceTile
                              key={service.name}
                              service={service}
                              index={index}
                              onClick={() =>
                                navigate(`/services/${slugify(service.name)}`)
                              }
                            />
                          ))}
                        </ul>
                      </section>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-dashed border-slate-300 px-6 py-16 text-center"
                  >
                    <h3 className="text-lg font-semibold">No services found</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Try another service name or category.
                    </p>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSearch("");
                        setActiveCategory(ALL);
                      }}
                      className="mt-5 rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
                    >
                      Reset filters
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Request a service */}

        <section className="bg-emerald-950 px-5 py-16 text-white sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.65, ease: easeOut }}
            className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center"
          >
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Can't find what you need?
              </h2>
              <p className="mt-3 max-w-lg text-base text-emerald-100/80">
                Tell us what you're looking for and we'll help you find the
                right professional.
              </p>
            </div>

            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/")}
              className="shrink-0 rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Request a service
            </motion.button>
          </motion.div>
        </section>
      </main>
    </MotionConfig>
  );
}