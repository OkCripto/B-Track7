import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { LandingHeader } from "@/components/landing/landing-header";
import { ParticleTextEffect } from "@/components/landing/particle-text-effect";

const particleWords = ["404", "Page", "Doesn't", "Exist"];

export default async function NotFound() {
  const { userId } = await auth();
  const isSignedIn = Boolean(userId);
  const primaryHref = isSignedIn ? "/dashboard" : "/signup";
  const primaryLabel = isSignedIn ? "Go to dashboard" : "Get started";

  return (
    <div className="min-h-screen bg-black text-white">
      <LandingHeader isSignedIn={isSignedIn} primaryHref={primaryHref} />

      <main className="pt-24">
        <section className="relative overflow-hidden bg-black">
          <div className="absolute inset-0">
            <ParticleTextEffect words={particleWords} className="opacity-85" textYRatio={0.42} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/35 to-black/95" />
          </div>

          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-10rem)] max-w-4xl flex-col items-center justify-end px-6 pb-14 pt-6 text-center sm:pb-16">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Error 404</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl font-display">
              Page Doesn&apos;t Exist
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-white/70 sm:text-base">
              The page you requested could not be found.
            </p>
            <div className="mt-7 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90 sm:w-auto"
              >
                Back to home
              </Link>
              <Link
                href={primaryHref}
                className="inline-flex w-full items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white sm:w-auto"
              >
                {primaryLabel}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
