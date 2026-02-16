"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { dashboardMarkup, type DashboardPage } from "./dashboardMarkup";
import { initBudgetDashboard } from "./initBudgetDashboard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type DashboardClientProps = {
  fontClassName?: string;
  initialPage?: DashboardPage;
};

export default function DashboardClient({
  fontClassName = "",
  initialPage,
}: DashboardClientProps) {
  const [chartsReady, setChartsReady] = useState(false);
  const [activePage, setActivePage] = useState<DashboardPage>(
    initialPage ?? "tracker"
  );
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const activePageRef = useRef(activePage);

  const pageRoutes = useMemo(
    () => ({
      tracker: "/dashboard",
      assets: "/dashboard/assets",
      "all-transactions": "/dashboard/transactions",
      analytics: "/dashboard/analytics",
    }),
    []
  );

  const markup = useMemo(
    () => ({ __html: dashboardMarkup(initialPage ?? "tracker") }),
    [initialPage]
  );

  useEffect(() => {
    if (!chartsReady || initializedRef.current) return;
    initializedRef.current = true;
    initBudgetDashboard({ initialPage });
  }, [chartsReady]);

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ page?: DashboardPage }>).detail;
      if (!detail?.page || detail.page === activePageRef.current) return;
      setActivePage(detail.page);
    };
    window.addEventListener("budget:page-change", handlePageChange as EventListener);
    return () => {
      window.removeEventListener(
        "budget:page-change",
        handlePageChange as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleUserChange = (event: Event) => {
      const detail = (event as CustomEvent<{ email?: string }>).detail;
      if (!detail) return;
      setUserEmail(detail.email || null);
    };
    window.addEventListener("budget:user-change", handleUserChange as EventListener);
    return () => {
      window.removeEventListener(
        "budget:user-change",
        handleUserChange as EventListener
      );
    };
  }, []);

  const handleNavigate = (page: DashboardPage) => {
    if (typeof window === "undefined") return;
    const setPage = (window as Window & { __budgetDashboardSetPage?: Function })
      .__budgetDashboardSetPage;
    if (typeof setPage === "function") {
      setPage(page);
      return;
    }
    window.location.href = pageRoutes[page];
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className={`budget-dashboard min-h-screen antialiased ${fontClassName}`.trim()}>
      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js"
        strategy="afterInteractive"
        onLoad={() => setChartsReady(true)}
      />
      <div id="app" className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <h1 className="text-3xl font-semibold text-foreground flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-primary"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path
                      fillRule="evenodd"
                      d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Budget Tracker
                </h1>
                <Button
                  id="visibility-toggle"
                  variant="ghost"
                  size="icon"
                  className="ml-2 rounded-full text-muted-foreground hover:text-foreground"
                  aria-label="Toggle balance visibility"
                >
                  <svg
                    id="eye-icon-open"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <svg
                    id="eye-icon-slashed"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 hidden"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243l-4.243-4.243zM11.828 15c-.623.623-1.478 1-2.428 1-1.933 0-3.5-1.567-3.5-3.5 0-.95.377-1.805 1-2.428M14.122 14.122L12 12"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c1.206 0 2.362.248 3.44.686M21 12c-1.274 4.057-5.064 7-9.542 7A9.97 9.97 0 015.025 15.025"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 3l18 18"
                    />
                  </svg>
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <nav className="flex items-center gap-1 rounded-lg border border-border bg-muted/70 p-1 shadow-sm">
                {([
                  { id: "nav-tracker", page: "tracker", label: "Tracker" },
                  { id: "nav-assets", page: "assets", label: "Assets" },
                  {
                    id: "nav-all-transactions",
                    page: "all-transactions",
                    label: "All Transactions",
                  },
                  { id: "nav-analytics", page: "analytics", label: "Analytics" },
                ] as const).map((item) => (
                  <Button
                    key={item.id}
                    id={item.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigate(item.page)}
                    className={cn(
                      "h-9 px-4",
                      activePage === item.page
                        ? "tab-active"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-current={activePage === item.page ? "page" : undefined}
                  >
                    {item.label}
                  </Button>
                ))}
              </nav>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-slate-900 text-white hover:bg-slate-800"
                    aria-label="Open user menu"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 2a5 5 0 00-3.535 8.535A7.5 7.5 0 002.5 17.5a.75.75 0 001.5 0A6 6 0 0110 11.5a6 6 0 016 6 .75.75 0 001.5 0 7.5 7.5 0 00-3.965-6.965A5 5 0 0010 2zm0 2.5a3 3 0 100 6 3 3 0 000-6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                    Signed in as
                  </DropdownMenuLabel>
                  <div className="px-2 pb-2 text-sm font-semibold truncate">
                    {userEmail || "Account"}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer font-medium"
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <div dangerouslySetInnerHTML={markup} />
      </div>
    </div>
  );
}
