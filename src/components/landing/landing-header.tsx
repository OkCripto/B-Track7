"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface LandingHeaderProps {
  isSignedIn: boolean;
  primaryHref: string;
}

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Release Notes", href: "/releases" },
];

export function LandingHeader({ isSignedIn, primaryHref }: LandingHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const resolveHref = (href: string) =>
    href.startsWith("#") ? (isHome ? href : `/${href}`) : href;

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isMenuOpen]);

  const handleCloseMenu = () => setIsMenuOpen(false);
  const handleToggleMenu = () => setIsMenuOpen((open) => !open);

  return (
    <>
      <header className="fixed left-1/2 top-6 z-50 w-[min(94%,980px)] -translate-x-1/2">
        <div className="flex items-center justify-between gap-4 rounded-full border border-white/10 bg-black/70 px-4 py-3 shadow-2xl backdrop-blur-xl md:grid md:grid-cols-[1fr_auto_1fr] md:px-5">
          <Link href="/" className="inline-flex w-fit items-center gap-3 text-base font-semibold tracking-tight">
            <Image src="/logo.svg" alt="B-Track7 logo" width={30} height={30} className="h-7 w-7" priority />
            <span>B-Track7</span>
          </Link>

          <nav className="hidden items-center justify-center gap-6 text-sm text-white/70 md:flex">
            {navItems.map((item) => {
              const resolvedHref = resolveHref(item.href);
              const isSamePageAnchor = item.href.startsWith("#") && isHome;
              return isSamePageAnchor ? (
                <a key={item.label} className="transition hover:text-white" href={resolvedHref}>
                  {item.label}
                </a>
              ) : (
                <Link key={item.label} className="transition hover:text-white" href={resolvedHref}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-2 text-sm font-semibold sm:gap-3">
            <button
              type="button"
              onClick={handleToggleMenu}
              aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/80 transition hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:hidden"
          >
            <span className="relative block h-4 w-4">
              <span
                className={`absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-[5px] rounded-full bg-current transition-transform duration-300 ${
                  isMenuOpen ? "translate-y-0 rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 translate-y-[5px] rounded-full bg-current transition-transform duration-300 ${
                  isMenuOpen ? "translate-y-0 -rotate-45" : ""
                }`}
              />
            </span>
          </button>

            <div className="hidden items-center justify-end gap-3 md:flex">
              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="rounded-full bg-white px-4 py-2 text-black transition hover:bg-white/90"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-full border border-white/15 px-4 py-2 text-white/80 transition hover:border-white/30 hover:text-white"
                  >
                    Sign in
                  </Link>
                  <Link
                    href={primaryHref}
                    className="rounded-full bg-white px-4 py-2 text-black transition hover:bg-white/90"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-40 bg-black transition-opacity duration-200 md:hidden ${
          isMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isMenuOpen}
      >
        <div
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          className={`absolute inset-0 flex h-full w-full flex-col justify-between bg-black px-6 pb-10 pt-28 text-white transition-transform duration-300 ease-out ${
            isMenuOpen ? "translate-y-0" : "translate-y-full"
          }`}
          onClick={handleCloseMenu}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <span className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">Menu</span>
            <nav className="mt-8 flex flex-col gap-6 text-2xl font-semibold">
              {navItems.map((item) => {
                const resolvedHref = resolveHref(item.href);
                const isSamePageAnchor = item.href.startsWith("#") && isHome;
                return isSamePageAnchor ? (
                  <a
                    key={item.label}
                    href={resolvedHref}
                    className="transition hover:text-white"
                    onClick={handleCloseMenu}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={resolvedHref}
                    className="transition hover:text-white"
                    onClick={handleCloseMenu}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-col gap-3 text-sm font-semibold" onClick={(event) => event.stopPropagation()}>
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-black transition hover:bg-white/90"
                onClick={handleCloseMenu}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/20 px-6 py-3 text-white/80 transition hover:border-white/40 hover:text-white"
                  onClick={handleCloseMenu}
                >
                  Sign in
                </Link>
                <Link
                  href={primaryHref}
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-black transition hover:bg-white/90"
                  onClick={handleCloseMenu}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
