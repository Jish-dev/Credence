import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  ShieldAlert,
} from "lucide-react";

// ========================================
// CONTENT & TYPES
// ========================================

const LAST_UPDATED = "9 November 2026";
const CONTACT_EMAIL = "hello@credence.in";

type Section = {
  id: string;
  title: string;
  category?: "general" | "customer" | "provider" | "legal";
  body: string[];
  list?: string[];
};

const sections: Section[] = [
  {
    id: "about",
    title: "About Credence",
    category: "general",
    body: [
      "Credence is an online platform that helps customers in Kerala find, compare and book independent service professionals such as electricians, plumbers, cleaners, painters and mechanics.",
      "Credence provides the platform only. Services are carried out by professionals who are independent of Credence, and the agreement for each service is between the customer and the professional.",
    ],
  },
  {
    id: "acceptance",
    title: "Accepting These Terms",
    category: "general",
    body: [
      "By creating an account, booking a service or otherwise using Credence, you agree to these Terms of Use and to our Privacy Policy. If you do not agree, please do not use the platform.",
      "You must be at least 18 years old and able to enter into a legally binding contract to use Credence.",
    ],
  },
  {
    id: "accounts",
    title: "Your Account Responsibilities",
    category: "general",
    body: [
      "You are responsible for the information you give us and for keeping your login details secure. Everything done through your account is treated as done by you.",
    ],
    list: [
      "Give accurate and current details, including your name, phone number and address.",
      "Do not share your account or create accounts for someone else without permission.",
      "Tell us promptly if you think your account has been misused.",
    ],
  },
  {
    id: "customers",
    title: "Booking Services as a Customer",
    category: "customer",
    body: [
      "Professional profiles show details such as services offered, location, ratings and starting prices. A starting price is an estimate and not a final quote.",
      "The final price depends on the work required and is agreed between you and the professional. A booking is confirmed only when the professional accepts it.",
    ],
    list: [
      "Describe the job clearly and give correct access and location details.",
      "Be available at the agreed time, or tell the professional in advance if your plans change.",
      "Treat professionals with respect and provide a safe working environment.",
    ],
  },
  {
    id: "professionals",
    title: "Listing Services as a Professional",
    category: "provider",
    body: [
      'Professionals may list their services on Credence after completing registration. A "Verified" badge means we have checked the documents you submitted at the time of review. It is not a guarantee of the quality of any particular job.',
    ],
    list: [
      "Your profile, prices, certifications and photos must be accurate and belong to you.",
      "You are responsible for the quality, safety and legality of the work you do, and for any licences, permits and taxes that apply to you.",
      "You are an independent professional, not an employee, agent or partner of Credence.",
      "We may unpublish or remove profiles that are inaccurate, inactive or in breach of these terms.",
    ],
  },
  {
    id: "payments",
    title: "Pricing and Payments",
    category: "customer",
    body: [
      "Prices are shown in Indian rupees (₹). Unless the platform clearly states otherwise, payment for a service is made directly between the customer and the professional once the work is completed.",
      "If Credence introduces online payments or platform fees, the amounts and conditions will be shown to you before you confirm a booking.",
    ],
  },
  {
    id: "cancellations",
    title: "Cancellations and Rescheduling",
    category: "customer",
    body: [
      "Please cancel or reschedule as early as you can so the professional can plan their day. Repeated last-minute cancellations or no-shows by customers or professionals may lead to restrictions on an account.",
    ],
  },
  {
    id: "reviews",
    title: "Reviews and User Content",
    category: "general",
    body: [
      "Ratings and reviews should be honest and based on a real experience. You keep ownership of what you post, but you give Credence a non-exclusive licence to display it on the platform.",
    ],
    list: [
      "No fake, paid or retaliatory reviews.",
      "No abusive, defamatory, discriminatory or unlawful content.",
      "No personal information about other people without their consent.",
    ],
  },
  {
    id: "conduct",
    title: "Acceptable Use Policy",
    category: "legal",
    body: ["When using Credence you agree not to:"],
    list: [
      "Break any law or infringe anyone's rights.",
      "Move a booking made through Credence off the platform to avoid any applicable fees.",
      "Scrape, copy or interfere with the platform, or attempt to access it without authorisation.",
      "Impersonate another person or misrepresent your skills or qualifications.",
      "Use the ORIN assistant to produce harmful, misleading or abusive content.",
    ],
  },
  {
    id: "orin",
    title: "ORIN AI Assistant Terms",
    category: "legal",
    body: [
      "ORIN is an automated assistant that helps you find professionals and understand how Credence works. Its answers may sometimes be incomplete or incorrect, so please check important details such as prices, availability and credentials on the professional's profile before booking.",
    ],
  },
  {
    id: "liability",
    title: "Disclaimers and Limits of Liability",
    category: "legal",
    body: [
      'Credence is provided "as is" and "as available". We work to keep the platform reliable but cannot promise it will always be uninterrupted or error-free.',
      "Because professionals are independent, Credence is not responsible for the quality, timing, safety or outcome of the services they provide, or for disputes between customers and professionals. To the extent permitted by law, Credence is not liable for indirect or consequential losses arising from use of the platform.",
      "Nothing in these terms limits any rights you have under applicable consumer protection law.",
    ],
  },
  {
    id: "suspension",
    title: "Suspension and Termination",
    category: "legal",
    body: [
      "You may stop using Credence at any time. We may suspend or close an account if these terms are broken, if we suspect fraud or misuse, or if we are required to by law.",
    ],
  },
  {
    id: "changes",
    title: "Changes to These Terms",
    category: "legal",
    body: [
      "We may update these terms from time to time. The date at the top of this page shows when they were last changed. If you keep using Credence after an update, you accept the new terms.",
    ],
  },
  {
    id: "law",
    title: "Governing Law & Jurisdiction",
    category: "legal",
    body: [
      "These terms are governed by the laws of India. Any dispute that cannot be settled informally will be subject to the courts located in Kerala.",
    ],
  },
  {
    id: "contact",
    title: "Contact & Inquiries",
    category: "general",
    body: [`Questions about these terms? Email us at ${CONTACT_EMAIL}.`],
  },
];

// ========================================
// TERMS PAGE COMPONENT
// ========================================

export default function Terms() {
  const [activeId, setActiveId] = useState<string>("about");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const visibleSections = useMemo(() => {
    if (filterCategory === "all") return sections;
    return sections.filter(
      (section) =>
        section.category === filterCategory || section.category === "general",
    );
  }, [filterCategory]);

  // Track the section currently visible in the content area.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );

    visibleSections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [visibleSections]);

  const scrollToSection = (id: string) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main className="min-h-screen bg-[#F8FBF9] font-sans text-slate-800 selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* TERMS & CONDITIONS BANNER */}
      <section className="w-full overflow-hidden bg-emerald-950">
        <img
          src="/Terms-and-conditions-Banner.png"
          alt="Terms and Conditions"
          className="block aspect-[3/1] max-h-[320px] min-h-[150px] w-full object-cover object-center"
        />
      </section>

      {/* CONTENT */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Page intro / metadata */}
        <div className="mb-7 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Legal information
            </p>
        
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Please review the terms that apply when using Credence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
              <ShieldAlert size={14} className="text-emerald-700" />
              Last updated: {LAST_UPDATED}
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800 print:hidden"
            >
              Print terms
            </button>
          </div>
        </div>

        {/* Category filters */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            Filter:
          </span>
          {[
            { id: "all", label: "All Terms" },
            { id: "customer", label: "For Customers" },
            { id: "provider", label: "For Professionals" },
            { id: "legal", label: "Platform & Legal" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterCategory(tab.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                filterCategory === tab.id
                  ? "bg-emerald-700 text-white shadow-sm shadow-emerald-900/10"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid items-stretch gap-7 lg:grid-cols-[250px_minmax(0,1fr)]">
          {/* Sticky section navigation (Single-page view without visible scrollbars) */}
          <aside className="hidden lg:block">
            <nav
              aria-label="Terms outline"
              className="sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm"
            >
              <p className="shrink-0 text-[11px] font-extrabold uppercase tracking-widest text-slate-900 px-2 pb-2">
                On this page
              </p>
              <div className="space-y-0.5 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {visibleSections.map((section, index) => {
                  const isActive = activeId === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[11px] font-medium transition ${
                        isActive
                          ? "bg-emerald-50 font-bold text-emerald-800"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span
                        className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-bold tabular-nums ${
                          isActive
                            ? "bg-emerald-200/60 text-emerald-900"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate">{section.title}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </aside>

          {/* Terms sections */}
          <div className="min-w-0 space-y-5">
            {visibleSections.map((section, index) => (
              <article
                key={section.id}
                id={section.id}
                className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-100 hover:shadow-md sm:p-7"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xs font-black text-emerald-800">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
                      {section.title}
                    </h2>

                    <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                      {section.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>

                    {section.list && (
                      <ul className="mt-4 space-y-3 rounded-xl bg-[#F7FAF8] p-4 text-sm leading-6 text-slate-700">
                        {section.list.map((item) => (
                          <li key={item} className="flex items-start gap-2.5">
                            <CheckCircle2
                              size={16}
                              className="mt-1 shrink-0 text-emerald-600"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {/* Contact card */}
            <section className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 sm:flex-row sm:items-center">
              <div>
                <h3 className="flex items-center gap-2 font-extrabold text-slate-900">
                  <Mail size={18} className="text-emerald-700" />
                  Have a question about these terms?
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Contact our support team at{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="font-bold text-emerald-800 underline underline-offset-2"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </div>

              <Link
                to="/professionals"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 active:scale-[0.98]"
              >
                Explore Professionals
                <ArrowRight size={16} />
              </Link>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}