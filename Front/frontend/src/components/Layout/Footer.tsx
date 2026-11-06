
import {
  Mail,
  MapPin,
  Phone,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div>
            <Link to="/" className="text-2xl font-black tracking-tight text-white">
              CREDENCE<span className="text-emerald-400">.</span>
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-7 text-slate-400">
              Your trusted service network. Discover reliable professionals
              and get everyday services done with confidence.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className="font-bold text-white">Explore</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li><Link to="/" className="hover:text-emerald-400">Home</Link></li>
              <li><Link to="/professionals" className="hover:text-emerald-400">Find Professionals</Link></li>
              <li><Link to="/bookings" className="hover:text-emerald-400">My Bookings</Link></li>
              <li><Link to="/profile" className="hover:text-emerald-400">My Profile</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-bold text-white">Popular Services</h3>
            <ul className="mt-5 space-y-3 text-sm">
              {["Electrical", "Plumbing", "AC Repair", "Home Cleaning", "Painting"].map((item) => (
                <li key={item}>
                  <Link
                    to={`/professionals?category=${encodeURIComponent(item)}`}
                    className="hover:text-emerald-400"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-white">Get in Touch</h3>
            <div className="mt-5 space-y-4 text-sm">
              <p className="flex items-center gap-3">
                <Mail size={17} className="text-emerald-400" />
                hello@credence.in
              </p>
              <p className="flex items-center gap-3">
                <Phone size={17} className="text-emerald-400" />
                Contact support
              </p>
              <p className="flex items-center gap-3">
                <MapPin size={17} className="text-emerald-400" />
                Kerala, India
              </p>
            </div>

            <Link
              to="/professionals"
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300"
            >
              Explore services <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="mt-14 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} CREDENCE. All rights reserved.</p>
          <p>Built for better everyday services.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
