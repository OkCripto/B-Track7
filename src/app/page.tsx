import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-slate-900">
            Budget Tracker
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">
              Personal finance, simplified
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Track every rupee with a dashboard you will actually use.
            </h1>
            <p className="text-lg text-slate-600">
              Budget Tracker keeps income, expenses, assets, and trends in one
              clear view. Add entries fast, spot patterns faster.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Start tracking
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
              >
                I already have an account
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-600">
                This month
              </p>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
                +12%
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {[
                { label: "Income", value: "₹84,200", tone: "text-green-600" },
                { label: "Expenses", value: "₹52,150", tone: "text-red-600" },
                { label: "Savings", value: "₹32,050", tone: "text-indigo-600" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span className={`text-sm font-semibold ${item.tone}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-slate-900 px-4 py-4 text-sm text-white">
              <p className="font-semibold">Net worth</p>
              <p className="mt-1 text-2xl font-semibold">₹418,900</p>
              <p className="mt-2 text-xs text-slate-300">
                Across cash, bank, and investments.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Daily clarity",
                description:
                  "Log transactions quickly and keep categories organized.",
              },
              {
                title: "Asset visibility",
                description:
                  "Track balances and transfers without spreadsheet chaos.",
              },
              {
                title: "Insightful trends",
                description:
                  "Visualize spending patterns and adjust budgets with ease.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-12 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Ready to put your finances on autopilot?
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Create an account in under a minute.
              </p>
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Create free account
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
