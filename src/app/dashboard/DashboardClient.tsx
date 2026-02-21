"use client";

import Script from "next/script";
import Image from "next/image";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { dashboardMarkup, type DashboardPage } from "./dashboardMarkup";
import { initBudgetDashboard } from "./initBudgetDashboard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import ExpenseByCategoryGauge from "./analytics/ExpenseByCategoryGauge";

type BudgetDashboardWindow = Window & {
  __budgetDashboardSetPage?: (page: DashboardPage) => void;
};

type DashboardClientProps = {
  fontClassName?: string;
  initialPage?: DashboardPage;
};

const navItems: { id: DashboardPage; label: string; icon: ReactNode }[] = [
  {
    id: "tracker",
    label: "Overview",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="9" rx="2" />
        <rect x="14" y="3" width="7" height="5" rx="2" />
        <rect x="14" y="12" width="7" height="9" rx="2" />
        <rect x="3" y="16" width="7" height="5" rx="2" />
      </svg>
    ),
  },
  {
    id: "assets",
    label: "Assets",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
        <path d="M3 7h18" />
        <path d="M16 10h2" />
      </svg>
    ),
  },
  {
    id: "all-transactions",
    label: "Transactions",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 3 4 7l4 4" />
        <path d="M4 7h16" />
        <path d="m16 21 4-4-4-4" />
        <path d="M20 17H4" />
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="M8 17v-3" />
        <path d="M13 17V5" />
        <path d="M18 17V9" />
      </svg>
    ),
  },
];

const pageTitles: Record<DashboardPage, string> = {
  tracker: "Overview",
  assets: "Assets",
  "all-transactions": "Transactions",
  analytics: "Analytics",
  settings: "Settings",
};

type DashboardTheme = "light" | "dark";

type DashboardUIState = {
  activePage: DashboardPage;
  chartsReady: boolean;
  markupReady: boolean;
  sidebarCollapsed: boolean;
  theme: DashboardTheme;
  searchFocused: boolean;
};

type DashboardUIAction =
  | { type: "setActivePage"; value: DashboardPage }
  | { type: "setChartsReady"; value: boolean }
  | { type: "setMarkupReady"; value: boolean }
  | { type: "toggleSidebar" }
  | { type: "setTheme"; value: DashboardTheme }
  | { type: "setSearchFocused"; value: boolean };

const createInitialUIState = (initialPage?: DashboardPage): DashboardUIState => ({
  activePage: initialPage ?? "tracker",
  chartsReady: false,
  markupReady: false,
  sidebarCollapsed: false,
  theme: "dark",
  searchFocused: false,
});

const dashboardUIReducer = (
  state: DashboardUIState,
  action: DashboardUIAction
): DashboardUIState => {
  switch (action.type) {
    case "setActivePage":
      return { ...state, activePage: action.value };
    case "setChartsReady":
      return { ...state, chartsReady: action.value };
    case "setMarkupReady":
      return { ...state, markupReady: action.value };
    case "toggleSidebar":
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case "setTheme":
      return { ...state, theme: action.value };
    case "setSearchFocused":
      return { ...state, searchFocused: action.value };
    default:
      return state;
  }
};

type DashboardMarkupContainerProps = {
  initialPage: DashboardPage;
  onReady: () => void;
};

function DashboardMarkupContainer({
  initialPage,
  onReady,
}: DashboardMarkupContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markupHtml = useMemo(() => dashboardMarkup(initialPage), [initialPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const template = document.createElement("template");
    template.innerHTML = markupHtml;
    container.replaceChildren(template.content.cloneNode(true));
    onReady();
  }, [markupHtml, onReady]);

  return <div ref={containerRef} />;
}

export default function DashboardClient({
  fontClassName = "",
  initialPage,
}: DashboardClientProps) {
  const [uiState, dispatch] = useReducer(dashboardUIReducer, initialPage, createInitialUIState);
  const { activePage, chartsReady, markupReady, sidebarCollapsed, theme, searchFocused } =
    uiState;
  const initializedRef = useRef(false);
  const activePageRef = useRef(activePage);

  const pageRoutes = useMemo(
    () => ({
      tracker: "/dashboard",
      assets: "/dashboard/assets",
      "all-transactions": "/dashboard/transactions",
      analytics: "/dashboard/analytics",
      settings: "/dashboard/settings",
    }),
    []
  );

  const handleMarkupReady = useCallback(() => {
    dispatch({ type: "setMarkupReady", value: true });
  }, []);

  useEffect(() => {
    if (!chartsReady || !markupReady || initializedRef.current) return;
    initializedRef.current = true;
    initBudgetDashboard({ initialPage });
  }, [chartsReady, markupReady, initialPage]);

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ page?: DashboardPage }>).detail;
      if (!detail?.page || detail.page === activePageRef.current) return;
      dispatch({ type: "setActivePage", value: detail.page });
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
    const stored = window.localStorage.getItem("theme");
    const initial = stored === "light" || stored === "dark" ? stored : "dark";
    dispatch({ type: "setTheme", value: initial });
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const handleNavigate = (page: DashboardPage) => {
    if (typeof window === "undefined") return;
    const setPage = (window as BudgetDashboardWindow).__budgetDashboardSetPage;
    if (typeof setPage === "function") {
      setPage(page);
      return;
    }
    window.location.assign(pageRoutes[page]);
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    dispatch({ type: "setTheme", value: nextTheme });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", nextTheme);
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
    }
  };

  const expenseSlot =
    typeof document === "undefined"
      ? null
      : document.getElementById("expense-by-category-slot");

  return (
    <div className={cn("budget-dashboard min-h-screen", fontClassName)}>
      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js"
        strategy="afterInteractive"
        onLoad={() => dispatch({ type: "setChartsReady", value: true })}
      />
      <div className="flex min-h-screen text-foreground">
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar/90 backdrop-blur flex flex-col transition-all duration-300 ease-out",
            sidebarCollapsed ? "w-[72px]" : "w-[260px]"
          )}
        >
          <div
            className={cn(
              "h-16 flex items-center border-b border-sidebar-border",
              sidebarCollapsed ? "px-2" : "px-4"
            )}
          >
            <div
              className={cn(
                "flex items-center min-w-0",
                sidebarCollapsed ? "gap-2" : "gap-3"
              )}
            >
              <div
                className={cn(
                  "rounded-lg flex items-center justify-center shrink-0 text-sidebar-foreground",
                  sidebarCollapsed ? "w-10 h-10" : "w-12 h-12"
                )}
              >
                <Image
                  src="/logo.svg"
                  alt="B-Track7"
                  width={32}
                  height={32}
                  className={cn(sidebarCollapsed ? "w-6 h-6" : "w-8 h-8")}
                />
              </div>
              <span
                className={cn(
                  "font-semibold text-lg text-sidebar-foreground whitespace-nowrap transition-all duration-300",
                  sidebarCollapsed ? "opacity-0 w-0" : "opacity-100"
                )}
              >
                B-Track7
              </span>
            </div>
            <button
              onClick={() => dispatch({ type: "toggleSidebar" })}
              className={cn(
                "ml-auto rounded-lg flex items-center justify-center text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200",
                sidebarCollapsed ? "h-8 w-8" : "h-9 w-9"
              )}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              )}
            </button>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-hidden">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative hover:translate-x-1 active:translate-x-0",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent transition-all duration-300",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span
                    className={cn(
                      "transition-colors duration-200",
                      isActive
                        ? "text-accent"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap transition-all duration-300",
                      sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                  aria-label="My account"
                >
                  <span className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21a8 8 0 0 0-16 0" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <span
                    className={cn(
                      "flex-1 text-left whitespace-nowrap transition-all duration-300",
                      sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                    )}
                  >
                    My Account
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-all duration-300",
                      sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                    )}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" sideOffset={12} className="w-52">
                <DropdownMenuItem
                  onClick={() => handleNavigate("settings")}
                  className="cursor-pointer gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="m4.93 4.93 1.41 1.41" />
                    <path d="m17.66 17.66 1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="m4.93 19.07 1.41-1.41" />
                    <path d="m17.66 6.34 1.41-1.41" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>
        <div
          className={cn(
            "flex min-h-screen flex-1 flex-col transition-all duration-300 ease-out",
            sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
          )}
        >
          <header className="h-16 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-6">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-semibold text-foreground">
                {pageTitles[activePage]}
              </h1>
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>This month</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "relative flex items-center transition-all duration-300",
                  searchFocused ? "w-64" : "w-44"
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute left-3 w-4 h-4 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  id="transaction-search-input"
                  type="text"
                  placeholder="Search..."
                  autoComplete="off"
                  onFocus={() => dispatch({ type: "setSearchFocused", value: true })}
                  onBlur={() => dispatch({ type: "setSearchFocused", value: false })}
                  className="w-full h-9 pl-9 pr-4 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-accent transition-all duration-200"
                />
                <div
                  id="transaction-search-dropdown"
                  className="absolute left-0 right-0 top-full z-40 mt-2 hidden max-h-72 overflow-auto rounded-xl border border-border/60 bg-card/95 p-1 shadow-xl backdrop-blur"
                />
              </div>
              <Button
                id="visibility-toggle"
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label="Toggle balance visibility"
              >
                <svg
                  id="eye-icon-open"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
                  />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg
                  id="eye-icon-slashed"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 hidden"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2 12s3.5-7 10-7a9.7 9.7 0 0 1 5 1.4"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M22 12s-3.5 7-10 7a9.7 9.7 0 0 1-5-1.4"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 14a3 3 0 0 1-4-4"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m3 3 18 18"
                  />
                </svg>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="M4.93 4.93 6.34 6.34" />
                    <path d="M17.66 17.66 19.07 19.07" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="M4.93 19.07 6.34 17.66" />
                    <path d="M17.66 6.34 19.07 4.93" />
                  </svg>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label="Notifications"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full animate-pulse" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <div className="content-animate">
              <DashboardMarkupContainer
                initialPage={initialPage ?? "tracker"}
                onReady={handleMarkupReady}
              />
            </div>
            {expenseSlot && createPortal(<ExpenseByCategoryGauge />, expenseSlot)}
          </main>
        </div>
      </div>
    </div>
  );
}

