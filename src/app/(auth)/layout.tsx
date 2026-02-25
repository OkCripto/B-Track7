"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackgroundPaths } from "@/components/landing/background-paths";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSignup = pathname?.includes("/signup");
  const headline = "Financial Control, Redefined.";
  const subheading = isSignup
    ? "Create your account to start tracking expenses, assets, and goals in one unified flow."
    : "Sign in to keep every balance, budget, and goal moving in one unified flow.";
  const infoCards = [
    {
      title: "Live budget guardrails",
      description: "Stay ahead with category nudges before overspending.",
    },
    {
      title: "Net worth clarity",
      description: "Track cash, assets, and debt in one clean view.",
    },
    {
      title: "Weekly insights",
      description: "See what moved and what needs attention next.",
    },
    {
      title: "Private by design",
      description: "Supabase Auth keeps access secure and simple.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        <div className="h-full w-full bg-gradient-to-br from-neutral-950 via-black to-neutral-900">
          <BackgroundPaths />
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/90" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:content-center lg:gap-x-12 lg:gap-y-6 lg:py-0">
        <div className="order-1 space-y-6 lg:col-start-1 lg:row-start-1">
          <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-white">
            <Image
              src="/logo.svg"
              alt="B-Track7 logo"
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="uppercase tracking-[0.25em] text-white/70">B-Track7</span>
          </Link>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl font-display">{headline}</h1>
          <p className="max-w-xl text-lg text-white/70">{subheading}</p>
          <div className="mt-6 hidden gap-4 sm:grid-cols-2 lg:grid">
            {infoCards.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm text-white/70">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="order-2 lg:col-start-2 lg:row-start-1">{children}</div>
        <div className="order-3 lg:hidden">
          <div className="grid gap-4 sm:grid-cols-2">
            {infoCards.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm text-white/70">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
