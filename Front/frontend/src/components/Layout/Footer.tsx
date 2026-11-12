import { Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

// ========================================
// DATA (edit these to your real details)
// ========================================

const company = {
  name: "Credence Services",
  addressLines: ["Malappuram, Kerala", "India"],
  phone: "+91 98765 43210",
  email: "hello@credence.in",
};

const knowMore = [
  { label: "About Credence", to: "/#about" },
  { label: "Find Professionals", to: "/professionals" },
  { label: "My Bookings", to: "/bookings" },
  { label: "Become a Professional", to: "/register-professional" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms of use", to: "/terms" },
];

const socials = [
  {
    label: "LinkedIn",
    href: "#",
    path: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4V21H3V9.75zm6.5 0h3.83v1.54h.05c.53-1.01 1.84-2.08 3.79-2.08 4.05 0 4.8 2.67 4.8 6.13V21h-4v-4.9c0-1.17-.02-2.67-1.63-2.67-1.63 0-1.88 1.27-1.88 2.59V21h-4V9.75z",
  },
  {
    label: "Instagram",
    href: "#",
    path: "M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5A3.95 3.95 0 0 0 16.25 3.8h-8.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zm5.2-2.45a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3z",
  },
  {
    label: "YouTube",
    href: "#",
    path: "M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2C2 8.78 2 12 2 12s0 3.22.4 4.8a2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77C22 15.22 22 12 22 12s0-3.22-.4-4.8zM10 15V9l5.2 3L10 15z",
  },
];

const Footer = () => {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">

          {/* Company */}
          <div>
            <h3 className="font-bold text-white">Company</h3>

            <p className="mt-5 font-semibold text-slate-100">{company.name}</p>

            <address className="mt-2 text-sm not-italic leading-7 text-slate-400">
              {company.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>

            <a
              href={`tel:${company.phone.replace(/\s/g, "")}`}
              className="mt-5 flex items-center gap-3 text-sm text-slate-200 transition hover:text-emerald-400"
            >
              <Phone size={17} className="text-emerald-400" />
              {company.phone}
            </a>

            <a
              href={`mailto:${company.email}`}
              className="mt-3 flex items-center gap-3 text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
            >
              <Mail size={17} />
              {company.email}
            </a>
          </div>

          {/* Know more */}
          <div>
            <h3 className="font-bold text-white">Know More</h3>
            <ul className="mt-5 space-y-3 text-sm">
              {knowMore.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="text-slate-300 transition hover:text-emerald-400"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Follow us */}
          <div>
            <h3 className="font-bold text-white">Follow us on</h3>
            <div className="mt-5 flex gap-3">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-emerald-500 hover:text-slate-950"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="19"
                    height="19"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Brand + app badges */}
          <div className="flex flex-col sm:col-span-2 lg:col-span-1 lg:items-end lg:text-right">
            <Link
              to="/"
              className="text-xl font-black tracking-tight text-white"
            >
             <img src="/w-logo.png" alt="" />
            </Link>

            <p className=" text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
              Trusted service network
            </p>

            <p className="mt-4 max-w-xs text-sm leading-7 text-slate-400">
              Discover reliable professionals and get everyday services done
              with confidence.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 lg:justify-end">
              <a
                href="#"
                aria-label="Get it on Google Play"
                className="flex items-center gap-2.5 rounded-lg border border-white/20 bg-black px-3.5 py-2 text-left transition hover:border-emerald-400"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M3.6 2.3 13.3 12 3.6 21.7a1.6 1.6 0 0 1-.6-1.3V3.6c0-.5.2-1 .6-1.3z" fill="#00A0FF" />
                  <path d="m16.6 8.7-3.3 3.3 3.3 3.3 3.9-2.2c1.1-.6 1.1-2.2 0-2.8l-3.9-1.6z" fill="#FFC107" />
                  <path d="M3.6 2.3c.4-.2.9-.2 1.4.1l11.6 6.3-3.3 3.3L3.6 2.3z" fill="#00E676" />
                  <path d="M3.6 21.7 13.3 12l3.3 3.3L5 21.6c-.5.3-1 .3-1.4.1z" fill="#FF3D00" />
                </svg>
                <span className="leading-none">
                  <span className="block text-[9px] uppercase tracking-wide text-slate-300">
                    Get it on
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-white">
                    Google Play
                  </span>
                </span>
              </a>

              <a
                href="#"
                aria-label="Download on the App Store"
                className="flex items-center gap-2.5 rounded-lg border border-white/20 bg-black px-3.5 py-2 text-left transition hover:border-emerald-400"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="white" aria-hidden="true">
                  <path d="M16.37 12.64c-.03-2.7 2.2-4 2.3-4.06-1.25-1.83-3.2-2.08-3.9-2.11-1.66-.17-3.24.98-4.08.98-.84 0-2.14-.96-3.52-.93-1.81.03-3.48 1.05-4.41 2.67-1.88 3.26-.48 8.1 1.35 10.75.9 1.3 1.97 2.75 3.37 2.7 1.35-.05 1.86-.87 3.5-.87 1.63 0 2.09.87 3.52.84 1.45-.03 2.38-1.32 3.27-2.62 1.03-1.5 1.45-2.96 1.48-3.03-.03-.01-2.84-1.09-2.88-4.32zM13.7 4.7c.74-.9 1.24-2.14 1.1-3.38-1.07.04-2.36.71-3.13 1.61-.69.79-1.29 2.06-1.13 3.28 1.19.09 2.4-.6 3.16-1.51z" />
                </svg>
                <span className="leading-none">
                  <span className="block text-[9px] text-slate-300">
                    Download on the
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-white">
                    App Store
                  </span>
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>Registered business details available on request.</p>
          <p>
            Copyright © {new Date().getFullYear()} Credence. All Rights
            Reserved
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;