import { motion, useReducedMotion } from "framer-motion";
import { Bell, CalendarCheck, ArrowUpRight, Check, QrCode } from "lucide-react";

/*
  Credence About — redesign
  Concept: the page is built from the thing Credence produces, a job record.
  Palette: deep emerald #06281D · moss #4F665B · mint paper #F0F7F3 · white · emerald #34D399
  Type: Bricolage Grotesque (headlines) + Instrument Sans (text)
*/

const steps = [
  {
    title: "Describe the job",
    text: "Browse by trade or explain the problem. Compare real profiles, specialties and availability.",
  },
  {
    title: "Book a clear window",
    text: "Pick a time that suits you and see what to expect before anyone arrives.",
  },
  {
    title: "Get the record",
    text: "When the work is signed off, you receive a permanent summary of what was done and who did it.",
  },
];

const principles = [
  {
    title: "Trust comes first",
    text: "Clear profiles, verified credentials and upfront service details let you hire with confidence.",
  },
  {
    title: "Respect for your time",
    text: "Find a specialist, agree a window, and follow progress without endless back-and-forth.",
  },
  {
    title: "People over algorithms",
    text: "We connect neighbors with independent tradespeople who take pride in their reputation.",
  },
  {
    title: "Accountability after the job",
    text: "Every stage is documented, from first scope to final sign-off.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export default function About() {
  const reduce = useReducedMotion();

  return (
    <main
      className="bg-[#F0F7F3] text-[#06281D] selection:bg-[#34D399] selection:text-[#06281D]"
      style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Instrument+Sans:wght@400;500;600&display=swap');
        .display { font-family: 'Bricolage Grotesque', 'Instrument Sans', system-ui, sans-serif; }
        .tick-rule {
          height: 10px;
          background-image: repeating-linear-gradient(90deg, #06281D 0 1px, transparent 1px 12px);
          opacity: .25;
        }
      `}</style>

      {/* HERO */}
      <section className="px-6 pb-20 pt-16 sm:px-10 lg:px-16 lg:pb-28 lg:pt-24">
        <div className="mx-auto grid max-w-[1280px] items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <p className="text-sm font-medium text-[#4F665B]">About Credence</p>
            <h1 className="display mt-5 text-[clamp(2.6rem,5.6vw,5.25rem)] font-bold leading-[1.02] tracking-[-0.035em]">
              Good work, done by good people, and written down.
            </h1>
            <p className="mt-8 max-w-[52ch] text-lg leading-relaxed text-[#35493F]">
              Credence is a local service platform for homeowners and independent
              professionals who care about craft. Find vetted expertise, book a
              reliable time, and keep a record of every job done in your space.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="/services"
                className="inline-flex items-center gap-2 rounded-md bg-[#06281D] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0B3D2C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#06281D]"
              >
                Browse services
                <ArrowUpRight size={16} />
              </a>
              <a
                href="#story"
                className="inline-flex items-center rounded-md border border-[#06281D]/25 px-6 py-3.5 text-sm font-semibold transition hover:border-[#06281D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#06281D]"
              >
                Read our story
              </a>
            </div>
          </div>

          {/* The memorable element: a job record with a sign-off stamp */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="relative mx-auto w-full max-w-[460px]"
          >
            <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_0_#06281D1a,0_24px_48px_-24px_#06281D55]">
              <div className="flex items-center justify-between bg-[#06281D] px-6 py-4 text-white">
                <span className="display text-lg font-bold tracking-tight">Credence</span>
                <span className="text-xs text-white/60">Job record</span>
              </div>
              <div className="tick-rule" />
              <dl className="divide-y divide-[#06281D]/10 px-6 text-sm">
                {[
                  ["Job", "Annual boiler service"],
                  ["Specialist", "Verified, licensed gas engineer"],
                  ["Visit", "Tue, 9:00–11:00 window"],
                  ["Parts", "Filter, seal kit"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 py-3.5">
                    <dt className="text-[#4F665B]">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex items-center justify-between gap-4 border-t border-dashed border-[#06281D]/25 bg-[#F0F7F3] px-6 py-5">
                <p className="max-w-[24ch] text-xs leading-5 text-[#4F665B]">
                  Scan the tag on the boiler to see this record any time.
                </p>
                <QrCode size={52} strokeWidth={1.4} />
              </div>
            </div>

            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 1.6, rotate: -14 }}
              animate={{ opacity: 1, scale: 1, rotate: -8 }}
              transition={{ delay: 0.9, duration: 0.35, ease: "easeOut" }}
              className="absolute -right-3 top-[44%] flex items-center gap-1.5 rounded-md border-2 border-[#06281D] bg-[#34D399] px-4 py-2 text-sm font-bold text-[#06281D] sm:-right-8"
            >
              <Check size={16} strokeWidth={3} /> Signed off
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* STORY */}
      <section id="story" className="bg-white px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
        <div className="mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <h2 className="display text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-4xl lg:max-w-[14ch]">
            Hiring help shouldn’t feel like a gamble.
          </h2>
          <div>
            <p className="text-xl leading-relaxed sm:text-2xl">
              The right tradesperson can turn a stressful household problem into a
              quick, painless fix. Finding that person shouldn’t mean digging
              through outdated directories or guessing who will actually show up.
            </p>
            <p className="mt-6 max-w-[62ch] text-base leading-8 text-[#35493F]">
              We started Credence to give independent professionals a place where
              their workmanship speaks for itself, and to give customers a calm,
              organized way to book, communicate and keep records of their home
              maintenance.
            </p>
            <div className="mt-12 grid gap-px overflow-hidden rounded-lg bg-[#06281D]/10 sm:grid-cols-2">
              <div className="bg-white p-6 sm:pr-8">
                <h3 className="display text-lg font-bold">Our mission</h3>
                <p className="mt-2 text-sm leading-7 text-[#35493F]">
                  Remove the friction from finding, scheduling and documenting
                  everyday local services.
                </p>
              </div>
              <div className="bg-white p-6 sm:pl-8">
                <h3 className="display text-lg font-bold">Our standard</h3>
                <p className="mt-2 text-sm leading-7 text-[#35493F]">
                  A neighborhood network where reliable work earns lasting trust,
                  not just fleeting star ratings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS: a real sequence, drawn as a timeline */}
      <section className="px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
        <div className="mx-auto max-w-[1280px]">
          <h2 className="display max-w-[22ch] text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-4xl">
            From first search to final sign-off.
          </h2>

          <ol className="mt-16 grid gap-10 md:grid-cols-3 md:gap-0">
            {steps.map((s, i) => (
              <li key={s.title} className="relative md:pr-10">
                {/* connector */}
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-12 top-[19px] hidden h-px w-[calc(100%-3rem)] bg-[#06281D]/25 md:block"
                  />
                )}
                <span
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                    i === steps.length - 1
                      ? "bg-[#34D399] text-[#06281D]"
                      : "bg-[#06281D] text-white"
                  }`}
                >
                  {i === steps.length - 1 ? <Check size={18} strokeWidth={3} /> : i + 1}
                </span>
                <h3 className="display mt-6 text-xl font-bold tracking-tight">{s.title}</h3>
                <p className="mt-3 max-w-[34ch] text-sm leading-7 text-[#35493F]">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PRINCIPLES: not a sequence, so no numbering */}
      <section className="bg-[#06281D] px-6 py-24 text-white sm:px-10 lg:px-16 lg:py-32">
        <div className="mx-auto max-w-[1280px]">
          <h2 className="display max-w-[20ch] text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-4xl">
            Software should stay out of the way and let expertise take center stage.
          </h2>
          <div className="mt-16 grid gap-x-16 gap-y-12 sm:grid-cols-2">
            {principles.map((p) => (
              <div key={p.title} className="border-t-2 border-[#34D399] pt-5">
                <h3 className="display text-xl font-bold tracking-tight">{p.title}</h3>
                <p className="mt-3 max-w-[44ch] text-base leading-7 text-white/70">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES: ORIN + Service Passport */}
      <section className="px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
        <div className="mx-auto max-w-[1280px]">
          <h2 className="display max-w-[20ch] text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-4xl">
            Credence features.
          </h2>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <article className="flex flex-col justify-between rounded-lg bg-white p-8 sm:p-10">
              <div>
            
                <h3 className="display mt-5 text-2xl font-bold tracking-tight">
                  ORIN: guidance when you aren’t sure who to call
                </h3>
                <p className="mt-4 max-w-[52ch] text-sm leading-7 text-[#35493F] sm:text-base">
                  Not every household issue comes with an obvious job title. ORIN
                  turns a plain-English problem into the right service category and
                  connects you with specialists equipped to handle it.
                </p>
              </div>
              <div className="mt-10 space-y-3 text-sm">
                <p className="ml-auto max-w-[88%] rounded-lg rounded-br-sm bg-[#06281D] px-4 py-3 text-white">
                  Water pressure dropped in the upstairs bathroom after a cold snap.
                </p>
                <p className="max-w-[88%] rounded-lg rounded-bl-sm bg-[#F0F7F3] px-4 py-3">
                  This sounds like a pipe issue. I’d book a licensed plumber for a
                  pipe inspection.
                </p>
              </div>
            </article>

            <article className="flex flex-col justify-between rounded-lg border border-[#06281D]/15 bg-white p-8 sm:p-10">
              <div>
                <h3 className="display mt-5 text-2xl font-bold tracking-tight">
                  Service Passport: a permanent record for every job
                </h3>
                <p className="mt-4 max-w-[52ch] text-sm leading-7 text-[#35493F] sm:text-base">
                  Months later, it’s hard to remember who serviced the boiler or
                  what parts were replaced. Scannable QR service tags keep your
                  maintenance history attached to your home.
                </p>
              </div>
              <div className="mt-10 flex items-center justify-between gap-6 rounded-lg bg-[#F0F7F3] p-5">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check size={15} className="shrink-0" /> Technician and date logged
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={15} className="shrink-0" /> Parts and notes saved
                  </li>
                </ul>
                <QrCode size={56} strokeWidth={1.4} className="shrink-0" />
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* MOBILE APP */}
      <section className="bg-white px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
        <div className="mx-auto grid max-w-[1280px] items-center gap-16 lg:grid-cols-[1fr_0.8fr] lg:gap-24">
          <div>
            <span className="inline-block rounded-full bg-[#34D399] px-3 py-1 text-xs font-semibold">
              Launching soon
            </span>
            <h2 className="display mt-5 max-w-[16ch] text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl">
              Credence Mobile app
            </h2>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-[#35493F]">
              Everything you do on Credence, in your pocket. Book a specialist,
              follow the visit, and open any job record the moment you need it.
            </p>
            <ul className="mt-10 space-y-6">
              {[
                [CalendarCheck, "Book and track", "Pick a window and see when your specialist is on the way."],
                [Bell, "Stay informed", "Get a notice when a visit is confirmed, started and signed off."],
                [QrCode, "Scan to see the record", "Point your camera at a service tag to open its full job history."],
              ].map(([Icon, title, text]: any) => (
                <li key={title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#F0F7F3] text-[#06281D]">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3 className="display text-lg font-bold">{title}</h3>
                    <p className="mt-1 max-w-[44ch] text-sm leading-7 text-[#35493F]">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Phone */}
          <div
            className="mx-auto w-full max-w-[290px] h-[500px] rounded-[2rem] border-[8px] border-[#06281D] bg-[#F0F7F3] shadow-[0_24px_48px_-24px_#06281D77]"
            aria-hidden
          >
            <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-[#06281D]/20" />
            <div className="space-y-4 px-5 pb-6 pt-6">
              <div>
                <p className="text-xs text-[#4F665B]">Your home</p>
                <p className="display text-xl font-bold tracking-tight">Job records</p>
              </div>
              <div className="rounded-lg bg-white p-4 text-sm shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Annual boiler service</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#34D399]">
                    <Check size={12} strokeWidth={3} />
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#4F665B]">Signed off · Filter, seal kit</p>
              </div>
              <div className="rounded-lg bg-white p-4 text-sm shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Pipe inspection</span>
                  <span className="rounded-full bg-[#06281D] px-2 py-0.5 text-[10px] font-semibold text-white">
                    Tue 9:00
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#4F665B]">Booked · Licensed plumber</p>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-lg bg-[#06281D] py-3 mt-40 text-sm font-semibold text-white">
                <QrCode size={16} /> Scan service tag
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#34D399] px-6 py-16 sm:px-10 lg:px-16 lg:py-20">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <h2 className="display max-w-[22ch] text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-4xl">
              Ready to find the right person for the job?
            </h2>
            <p className="mt-3 text-base text-[#06281D]/75">
              Browse available services and connect with local professionals.
            </p>
          </div>
          <a
            href="/services"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[#06281D] px-7 py-4 text-sm font-semibold text-white transition hover:bg-[#0B3D2C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#06281D]"
          >
            Browse services
            <ArrowUpRight size={17} />
          </a>
        </div>
      </section>
    </main>
  );
}