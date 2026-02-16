import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600"
          >
            Budget Tracker
          </Link>
          <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Your money, organized with calm clarity.
          </h1>
          <p className="max-w-xl text-lg text-slate-600">
            Track income, expenses, assets, and trends in one focused
            dashboard. No noise, just the insights you need.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Daily tracking",
                description: "Log transactions in seconds and stay current.",
              },
              {
                title: "Asset overview",
                description: "See net worth and balances at a glance.",
              },
              {
                title: "Smart analytics",
                description: "Spot patterns with clean, readable charts.",
              },
              {
                title: "Private by design",
                description: "Supabase Auth keeps your data locked down.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {item.title}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
