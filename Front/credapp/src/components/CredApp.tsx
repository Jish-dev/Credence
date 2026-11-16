import { motion, useReducedMotion } from "framer-motion";
import { HardHat, CalendarClock, Hammer } from "lucide-react";

const HAZARD =
  "bg-[repeating-linear-gradient(-45deg,#FFC61A_0_14px,#0F2A17_14px_28px)]";

export default function CredApp() {
  const reduce = useReducedMotion();

  return (
    <main className="flex min-h-[100dvh] flex-col bg-white font-sans text-[#0F2A17]">
      {/* Top hazard tape */}
      <div className={`h-2 w-full ${HAZARD}`} aria-hidden="true" />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-6 sm:px-10">
        {/* Brand */}
        <header className="flex items-center gap-3">
          <img
            src="/C-Logo.png"
            alt="Credence logo"
            className="h-10 w-10 object-contain"
          />
          <span className="text-lg font-extrabold tracking-[0.12em]">
            CREDENCE APP
          </span>
        </header>

        {/* Hero */}
        <section className="grid flex-1 items-center gap-8 py-6 lg:grid-cols-2 lg:gap-12">
          {/* Illustration */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="order-1 mx-auto w-full max-w-[300px] sm:max-w-[400px] lg:order-2 lg:max-w-[500px]"
          >
            <img
              src="/Cred-App.png"
              alt="A crew of construction workers building the Credence C"
              className="h-auto w-full select-none object-contain"
              draggable={false}
            />
          </motion.div>

          {/* Copy */}
          <div className="order-2 text-center lg:order-1 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-md bg-[#FFC61A] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#0F2A17]">
              <HardHat size={16} strokeWidth={2.4} />
              Under construction
            </div>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              Launching
              <br />
              <span className="relative inline-block">
                next month.
                <span
                  className="absolute -bottom-1 left-0 h-[10px] w-full rounded-sm bg-[#84E01A]/70"
                  aria-hidden="true"
                  style={{ zIndex: -1 }}
                />
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#0F2A17]/70 lg:mx-0">
              Our crew is putting the finishing touches on the Credence mobile
              app, so finding, booking and managing trusted services is
              simple and dependable.
            </p>

            {/* Build progress */}
            <div className="mx-auto mt-8 max-w-md lg:mx-0">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span className="inline-flex items-center gap-2">
                  <Hammer size={16} className="text-[#2E9E2E]" />
                  Build progress
                </span>
                <span className="text-[#2E9E2E]">20%</span>
              </div>
              <div
                className="h-4 w-full overflow-hidden rounded-full border-2 border-[#0F2A17] bg-white"
                role="progressbar"
                aria-valuenow={20}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Build progress"
              >
                <motion.div
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: "20%" }}
                  transition={{ delay: 0.4, duration: 1.4, ease: "easeOut" }}
                  className="h-full bg-[repeating-linear-gradient(-45deg,#84E01A_0_10px,#2E9E2E_10px_20px)]"
                />
              </div>
            </div>

            {/* Launch note */}
            <div className="mx-auto mt-6 inline-flex items-center gap-3 rounded-xl border-2 border-[#0F2A17] px-4 py-3 text-left shadow-[4px_4px_0_#84E01A] lg:mx-0">
              <CalendarClock size={22} className="text-[#FF8A1F]" />
              <div>
                <p className="text-sm font-bold leading-tight">
                  Opening next month
                </p>
                <p className="text-xs text-[#0F2A17]/60">
                  Thanks for waiting while we build it right.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pb-2 text-center text-xs text-[#0F2A17]/50">
          © {new Date().getFullYear()} Credence. Built for trust.
        </footer>
      </div>

      {/* Bottom hazard tape */}
      <div className={`h-3 w-full ${HAZARD}`} aria-hidden="true" />
    </main>
  );
}