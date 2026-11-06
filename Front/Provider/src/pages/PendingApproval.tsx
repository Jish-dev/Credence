
import { Clock3, ShieldCheck, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PendingApproval() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <Clock3 size={32} className="text-amber-600" />
        </div>

        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-600">
          CREDENCE PROVIDER
        </p>

        <h1 className="text-2xl font-bold text-slate-900">
          Registration submitted!
        </h1>

        <p className="mt-3 leading-7 text-slate-500">
          Your provider account has been created successfully.
          Our admin team will review your details before approving
          your account.
        </p>

        <div className="mt-7 rounded-xl bg-amber-50 p-4 text-left">
          <div className="flex items-center gap-3">
            <Clock3 size={20} className="text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">
                Approval pending
              </p>
              <p className="mt-1 text-sm text-amber-700">
                Your account is waiting for admin verification.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 text-left text-sm text-slate-500">
          <ShieldCheck size={20} className="shrink-0 text-blue-600" />
          <p>
            Once approved, you can log in and start managing your
            bookings through the provider dashboard.
          </p>
        </div>

        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-medium text-white transition hover:bg-slate-800"
        >
          <ArrowLeft size={17} />
          Back to login
        </Link>
      </div>
    </div>
  );
}
