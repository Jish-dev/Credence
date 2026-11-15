import { motion } from "framer-motion";
import {
    ArrowRight,
    ArrowUpRight,
    ShieldCheck,
    Users,
    Target,
    HeartHandshake,
    MapPin,
    Check,
} from "lucide-react";

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
};

const values = [
    {
        icon: ShieldCheck,
        title: "Upfront & Transparent",
        description:
            "Clear service scopes, verified profiles, and honest pricing before anyone steps through your door.",
    },
    {
        icon: HeartHandshake,
        title: "Built Around Your Schedule",
        description:
            "Book professionals when you actually need them—without endless phone tag or vague arrival windows.",
    },
    {
        icon: Target,
        title: "Vetted Craftsmanship",
        description:
            "We prioritize skilled tradespeople and specialists who take pride in doing the job right the first time.",
    },
    {
        icon: Users,
        title: "Neighborhood First",
        description:
            "Strengthening local economies by connecting you directly with independent experts working in your area.",
    },
];

const steps = [
    {
        number: "01",
        title: "Tell us what you need",
        description:
            "Browse specific trade categories or search for an urgent repair in your neighborhood.",
    },
    {
        number: "02",
        title: "Compare & pick a time",
        description:
            "Review local professionals, check their availability, and lock in a slot that fits your day.",
    },
    {
        number: "03",
        title: "Track until completion",
        description:
            "Get real-time status updates from confirmation to arrival until the job is signed off.",
    },
];

export default function About() {
    return (
        <main className="min-h-screen bg-[#fafaf9] text-stone-900 selection:bg-emerald-200 selection:text-emerald-950">
            {/* HERO — Asymmetric Editorial Split */}
            <section className="border-b border-stone-200 bg-white px-6 py-20 md:py-28">
                <div className="mx-auto grid max-w-7xl items-end gap-12 lg:grid-cols-12">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={fadeUp}
                        transition={{ duration: 0.5 }}
                        className="lg:col-span-7"
                    >
                        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                            <span className="h-px w-8 bg-emerald-600" />
                            About Credence
                        </div>

                        <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-stone-950 sm:text-5xl md:text-6xl">
                            Dependable local help,{" "}
                            <span className="font-normal italic text-emerald-700">
                                without the guesswork.
                            </span>
                        </h1>

                        <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-600">
                            Credence connects homeowners and businesses with vetted local
                            professionals. From leaky pipes to routine maintenance, we bring
                            clarity, scheduling, and accountability into one straightforward
                            place.
                        </p>

                        <div className="mt-10 flex flex-wrap items-center gap-4">
                            <a
                                href="/services"
                                className="inline-flex items-center gap-2.5 rounded-lg bg-emerald-700 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-emerald-800"
                            >
                                Browse Services
                                <ArrowRight size={16} />
                            </a>

                            <a
                                href="#our-story"
                                className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-6 py-3.5 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
                            >
                                Why we built this
                            </a>
                        </div>
                    </motion.div>

                    {/* Framed Photo + Grounded Caption Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="lg:col-span-5"
                    >
                        <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                            <img
                                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1000&q=85"
                                alt="Home service professional at work"
                                className="h-[340px] w-full object-cover md:h-[400px]"
                            />
                            <div className="flex items-center justify-between border-t border-stone-200 bg-white px-5 py-4">
                                <div className="flex items-center gap-2.5 text-sm font-medium text-stone-800">
                                    <MapPin size={16} className="text-emerald-700" />
                                    Local professionals in your area
                                </div>
                                <span className="text-xs font-medium text-stone-400">
                                    Verified Network
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* OUR STORY — Split Two-Column Manifesto */}
            <section id="our-story" className="border-b border-stone-200 px-6 py-24">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    transition={{ duration: 0.5 }}
                    className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-12"
                >
                    <div className="lg:col-span-5">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                            Our Story
                        </span>
                        <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-stone-950 md:text-4xl">
                            Hiring a pro shouldn’t feel like a gamble.
                        </h2>
                    </div>

                    <div className="space-y-6 text-base leading-relaxed text-stone-600 md:text-lg lg:col-span-7">
                        <p>
                            Anyone who has ever needed an urgent repair knows the routine:
                            scrolling through outdated directories, leaving voicemails that
                            never get returned, and wondering who is actually going to show
                            up at the door.
                        </p>
                        <p>
                            We started Credence to fix that disconnect. Instead of acting as a
                            noisy bulletin board, we built an organized booking network where
                            skilled local professionals can showcase their real availability,
                            and customers can book with clear expectations from start to
                            finish.
                        </p>

                        {/* Mission & Vision integrated cleanly as architectural callouts */}
                        <div className="grid gap-6 border-t border-stone-200 pt-8 sm:grid-cols-2">
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-900">
                                    Our Mission
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                                    Remove the friction from finding, scheduling, and tracking
                                    everyday home and local services.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-900">
                                    Our Vision
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                                    Become the most trusted neighborhood directory where great
                                    local tradespeople thrive on reputation.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* HOW IT WORKS — Clean Architectural Steps (No Floating Cards) */}
            <section className="border-b border-stone-200 bg-white px-6 py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="max-w-2xl">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                            How It Works
                        </span>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">
                            From search to signed off in three steps.
                        </h2>
                    </div>

                    <div className="mt-14 grid divide-y divide-stone-200 border-y border-stone-200 md:grid-cols-3 md:divide-x md:divide-y-0">
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.number}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUp}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                                className="py-8 md:px-8 md:py-10 first:md:pl-0 last:md:pr-0"
                            >
                                <span className="font-mono text-sm font-semibold text-emerald-700">
                                    STEP {step.number}
                                </span>
                                <h3 className="mt-4 text-xl font-semibold text-stone-950">
                                    {step.title}
                                </h3>
                                <p className="mt-3 text-sm leading-relaxed text-stone-600">
                                    {step.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* VALUES — Structured 2x2 Grid with Crisp Hairlines */}
            <section className="px-6 py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                                Principles
                            </span>
                            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">
                                What we stand behind
                            </h2>
                        </div>
                        <p className="max-w-md text-sm leading-relaxed text-stone-600">
                            Every product decision we make is measured against how well it
                            serves both the customer and the professional doing the work.
                        </p>
                    </div>

                    <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 sm:grid-cols-2">
                        {values.map((value, index) => {
                            const Icon = value.icon;
                            return (
                                <motion.div
                                    key={value.title}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true }}
                                    variants={fadeUp}
                                    transition={{ delay: index * 0.08 }}
                                    className="bg-white p-8 md:p-10"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
                                        <Icon size={20} />
                                    </div>
                                    <h3 className="mt-6 text-lg font-semibold text-stone-950">
                                        {value.title}
                                    </h3>
                                    <p className="mt-2.5 text-sm leading-relaxed text-stone-600">
                                        {value.description}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA — Grounded Deep Forest Banner */}
            <section className="px-6 pb-24">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-2xl bg-emerald-950 px-8 py-14 text-white md:flex-row md:items-center md:px-14"
                >
                    <div className="max-w-xl">
                        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            Ready to cross that task off your list?
                        </h2>
                        <p className="mt-3 text-sm leading-relaxed text-emerald-200/80 sm:text-base">
                            Explore available services in your area and book a vetted local
                            professional in minutes.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-emerald-300">
                            <span className="inline-flex items-center gap-1.5">
                                <Check size={14} /> No hidden booking fees
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Check size={14} /> Direct status tracking
                            </span>
                        </div>
                    </div>

                    <a
                        href="/services"
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
                    >
                        Explore Services
                        <ArrowUpRight size={17} />
                    </a>
                </motion.div>
            </section>
        </main>
    );
}