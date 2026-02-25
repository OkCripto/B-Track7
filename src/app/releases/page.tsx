import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
import { ReleaseNotesScrollParticleField } from "@/components/release-notes/scroll-particle-field";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Release Notes | B-Track7",
  description: "Track every B-Track7 product update, including improvements, fixes, and patches.",
  alternates: {
    canonical: "/releases",
  },
  openGraph: {
    title: "Release Notes | B-Track7",
    description: "Track every B-Track7 product update, including improvements, fixes, and patches.",
    url: "/releases",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Release Notes | B-Track7",
    description: "Track every B-Track7 product update, including improvements, fixes, and patches.",
  },
};

type RawReleaseNoteRecord = {
  id: string;
  version: string;
  title: string | null;
  description: string;
  released_on: string | null;
  improvements: unknown;
  fixes: unknown;
  patches: unknown;
  created_at: string;
};

type ReleaseNoteRecord = {
  id: string;
  version: string;
  title: string;
  description: string;
  released_on: string;
  improvements: string[];
  fixes: string[];
  patches: string[];
};

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

async function getReleaseNotes(): Promise<ReleaseNoteRecord[]> {
  const supabase = await createSupabaseServerClient({ allowSetCookies: false });
  const { data, error } = await supabase
    .from("release_notes")
    .select("id, version, title, description, released_on, improvements, fixes, patches, created_at")
    .order("released_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as RawReleaseNoteRecord[]).map((row) => ({
    id: row.id,
    version: row.version,
    title: row.title?.trim() || "Product update",
    description: row.description,
    released_on: row.released_on || row.created_at,
    improvements: parseStringList(row.improvements),
    fixes: parseStringList(row.fixes),
    patches: parseStringList(row.patches),
  }));
}

function formatVersion(version: string) {
  return version.startsWith("v") ? version : `v${version}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function ChangeSection({ label, items }: { label: string; items: string[] }) {
  return (
    <details className="group border-b border-white/10 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base text-white/85">
        <span>
          {label} ({items.length})
        </span>
        <span className="text-white/50 group-open:hidden">+</span>
        <span className="hidden text-white/50 group-open:inline">-</span>
      </summary>
      {items.length === 0 ? (
        <p className="pt-3 text-sm text-white/45">No items for this section.</p>
      ) : (
        <ul className="list-disc space-y-2 pl-5 pt-3 text-sm text-white/75">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </details>
  );
}

export default async function ReleaseNotesPage() {
  const supabase = await createSupabaseServerClient({ allowSetCookies: false });
  const { data } = await supabase.auth.getUser();
  const isSignedIn = Boolean(data?.user);
  const primaryHref = isSignedIn ? "/dashboard" : "/signup";
  const releaseNotes = await getReleaseNotes();

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <ReleaseNotesScrollParticleField />
      <div
        aria-hidden
        className="absolute inset-0 z-[2] bg-gradient-to-b from-black/36 via-black/26 to-black/40"
      />
      <div className="md:hidden">
        <LandingHeader isSignedIn={isSignedIn} primaryHref={primaryHref} />
      </div>

      <header className="fixed left-1/2 top-6 z-50 hidden w-[min(94%,980px)] -translate-x-1/2 md:block">
        <div className="grid items-center gap-4 rounded-full border border-white/10 bg-black/70 px-5 py-3 shadow-2xl backdrop-blur-xl md:grid-cols-[1fr_auto_1fr]">
          <Link href="/" className="inline-flex w-fit items-center gap-3 text-base font-semibold tracking-tight">
            <Image
              src="/logo.svg"
              alt="B-Track7 logo"
              width={30}
              height={30}
              className="h-7 w-7"
              priority
            />
            <span>B-Track7</span>
          </Link>

          <nav className="hidden items-center justify-center gap-6 text-sm text-white/70 md:flex">
            <Link className="transition hover:text-white" href="/#features">
              Features
            </Link>
            <Link className="transition hover:text-white" href="/#pricing">
              Pricing
            </Link>
            <Link className="transition hover:text-white" href="/#faq">
              FAQ
            </Link>
            <span className="text-white">Release Notes</span>
          </nav>

          <div className="flex items-center justify-end gap-3 text-sm font-semibold">
            <Link
              href="/dashboard"
              className="rounded-full bg-white px-4 py-2 text-black transition hover:bg-white/90"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-32">
        <section className="mb-10 border-b border-white/10 pb-8">
          <h1 className="text-3xl font-bold sm:text-4xl">Release Notes</h1>
          <p className="mt-3 text-sm text-white/60">Track every improvement and evolution.</p>
        </section>

        {releaseNotes.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            No release notes have been published yet.
          </div>
        ) : (
          <section className="space-y-6">
            <div className="hidden border-b border-white/10 pb-3 text-sm text-white/55 md:grid md:grid-cols-[170px_1fr]">
              <p>Version</p>
              <p>Description</p>
            </div>

            {releaseNotes.map((entry) => (
              <article key={entry.id} className="md:grid md:grid-cols-[170px_1fr] md:gap-8">
                <div className="pb-4 md:pb-0">
                  <p className="text-2xl font-semibold tracking-tight">{formatVersion(entry.version)}</p>
                  <p className="mt-1 text-sm text-white/60">{formatDate(entry.released_on)}</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
                  <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
                    <h2 className="text-3xl font-semibold leading-tight">{entry.title}</h2>
                    <p className="text-base text-white/75">{entry.description}</p>
                  </div>

                  <div className="mt-6 border-t border-white/10">
                    <ChangeSection label="Improvements" items={entry.improvements} />
                    <ChangeSection label="Fixes" items={entry.fixes} />
                    <ChangeSection label="Patches" items={entry.patches} />
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
