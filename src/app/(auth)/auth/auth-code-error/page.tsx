import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">
          Authentication error
        </p>
        <h2 className="text-3xl font-semibold text-slate-900">
          We couldn't complete that sign-in
        </h2>
        <p className="text-sm text-slate-600">
          The authentication link expired or was already used. Please try again.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          href="/login"
        >
          Back to sign in
        </Link>
        <Link
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          href="/signup"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
