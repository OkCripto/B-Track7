import Image from "next/image";
import Link from "next/link";
import { ParticleTextEffect } from "@/components/landing/particle-text-effect";
import { LandingHeader } from "@/components/landing/landing-header";
import { Reveal } from "@/components/landing/reveal";
import { BackgroundPaths } from "@/components/landing/background-paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const particleWords = ["B-7", "B-Track7", "Budget", "Tracking"];

const features = [
  {
    title: "Instant capture",
    description: "Log income and expenses in seconds with smart categories that stay organized.",
  },
  {
    title: "Live budget guardrails",
    description: "Watch categories fill in real time and get nudges before you overspend.",
  },
  {
    title: "Cashflow timeline",
    description: "See upcoming bills and paychecks in one rolling view to avoid surprises.",
  },
  {
    title: "Assets + net worth",
    description: "Track cash, investments, and debt together to see the full picture.",
  },
  {
    title: "Goal buckets",
    description: "Create savings goals, fund them automatically, and celebrate milestones.",
  },
  {
    title: "Weekly insights",
    description: "Get clear summaries of what changed, what is trending, and what to fix next.",
  },
];

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    description: "Everything you need to start tracking today.",
    features: ["Unlimited categories", "Monthly summaries", "Single workspace"],
  },
];

const faqs = [
  {
    question: "When will B-Track7 be available?",
    answer: "We are finishing the core experience now. Join the early list to get access as soon as it drops.",
  },
  {
    question: "Will I be able to move my data in and out?",
    answer: "Yes. We are building simple imports and exports so you stay in control of your money data.",
  },
  {
    question: "Does B-Track7 support multiple accounts?",
    answer: "Multi-account views are part of Track7 Plus. You can still start with one workspace for free.",
  },
  {
    question: "Can I invite a partner or teammates?",
    answer: "Shared budgets and permissions are planned for the Team tier.",
  },
  {
    question: "Is my data private?",
    answer: "Privacy is core to the product. We will publish full security details before launch.",
  },
];

export default async function Home() {
  const supabase = await createSupabaseServerClient({ allowSetCookies: false });
  const { data } = await supabase.auth.getUser();
  const isSignedIn = Boolean(data?.user);
  const primaryHref = isSignedIn ? "/dashboard" : "/signup";
  const primaryLabel = isSignedIn ? "Go to dashboard" : "Get started";
  const heroPrimaryLabel = isSignedIn ? "Open dashboard" : "Start tracking";
  return (
    <div className="min-h-screen bg-black text-white">
      <LandingHeader isSignedIn={isSignedIn} primaryHref={primaryHref} />

      <main className="pt-24">
        <section className="relative overflow-hidden bg-black">
          <div className="absolute inset-0">
            <ParticleTextEffect words={particleWords} className="opacity-85" textYRatio={0.42} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/35 to-black/95" />
          </div>

          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-10rem)] max-w-6xl flex-col px-6 pb-12 pt-6">
            <div className="mt-auto mb-0 text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">
                Budgeting that feels alive
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl font-display">
                Financial Control, Redefined
              </h1>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={primaryHref}
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  {heroPrimaryLabel}
                </Link>
                {!isSignedIn && (
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
                  >
                    I already have an account
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="relative border-t border-white/10 bg-black py-24 scroll-mt-28">
          <Reveal>
            <div className="relative z-10 mx-auto max-w-6xl px-6">
              <div className="mx-auto mb-14 max-w-3xl text-center">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Features</p>
                <h2 className="mt-4 text-3xl font-semibold sm:text-4xl font-display">
                  Everything you need to run your money like a system.
                </h2>
                <p className="mt-4 text-white/70">
                  Built for daily clarity, B-Track7 keeps budgets, assets, and goals in a single flow.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
                  >
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="mt-3 text-sm text-white/70">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>
        <section id="pricing" className="relative border-t border-white/10 bg-black py-24 scroll-mt-28">
          <Reveal>
            <div className="relative z-10 mx-auto max-w-6xl px-6">
              <div className="mx-auto mb-14 max-w-3xl text-center">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Pricing</p>
                <h2 className="mt-4 text-3xl font-semibold sm:text-4xl font-display">
                  Free while we build the full suite.
                </h2>
                <p className="mt-4 text-white/70">
                  No paywall today. Billing will arrive after launch.
                </p>
              </div>

              <div className="grid place-items-center gap-6">
                {pricingTiers.map((tier) => (
                  <div
                    key={tier.name}
                    className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur"
                  >
                    <h3 className="text-xl font-semibold">{tier.name}</h3>
                    <p className="mt-2 text-sm text-white/70">{tier.description}</p>
                    <div className="mt-6 flex items-end gap-2">
                      <span className="text-4xl font-semibold">{tier.price}</span>
                      <span className="text-sm text-white/50">per month</span>
                    </div>
                    <ul className="mt-6 space-y-3 text-sm text-white/70">
                      {tier.features.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={primaryHref}
                      className="mt-8 inline-flex w-full items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
                    >
                      {primaryLabel}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>
        <section id="faq" className="relative border-t border-white/10 bg-black py-24 scroll-mt-28">
          <Reveal>
            <div className="relative z-10 mx-auto max-w-4xl px-6">
              <div className="mb-12 text-center">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">FAQ</p>
                <h2 className="mt-4 text-3xl font-semibold sm:text-4xl font-display">
                  Questions, answered before you ask.
                </h2>
                <p className="mt-4 text-white/70">
                  Need something else? Reach out and we will get back quickly.
                </p>
              </div>

              <div className="space-y-4">
                {faqs.map((faq) => (
                  <details
                    key={faq.question}
                    className="group rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-white/70"
                  >
                    <summary className="cursor-pointer list-none text-base font-semibold text-white">
                      {faq.question}
                    </summary>
                    <p className="mt-3 text-white/70">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </Reveal>
        </section>
        <section className="relative overflow-hidden border-t border-white/10 bg-black py-24">
          <div className="absolute inset-0">
            <div className="h-full w-full bg-gradient-to-br from-neutral-950 via-black to-neutral-900">
              <BackgroundPaths />
              <div className="absolute inset-0 opacity-25">
                <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
                <div
                  className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl"
                  style={{ animationDelay: "1s" }}
                />
                <div
                  className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl"
                  style={{ animationDelay: "2s" }}
                />
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-black/85" />
          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
            <h2 className="text-3xl font-semibold sm:text-4xl font-display">
              Ready to take your financials in your own hands?
            </h2>
            <p className="mt-4 text-white/70">
              Start with a clean budget and let B-Track7 guide the next move.
            </p>
            <Link
              href={primaryHref}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              {primaryLabel}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-white/50 sm:flex-row">
          <div className="flex items-center gap-3 text-white/80">
            <Image src="/logo.svg" alt="B-Track7 logo" width={26} height={26} className="h-6 w-6" />
            <span>B-Track7</span>
          </div>
          <span>Copyright 2026 B-Track7. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

