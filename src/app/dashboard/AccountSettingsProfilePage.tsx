"use client";

import { FormEvent, useEffect, useState } from "react";

type SettingsPayload = {
  monthly_savings_target: number;
  use_compact_currency: boolean;
};

type StatusTone = "neutral" | "success" | "error";
type DashboardTheme = "light" | "dark";

const DEFAULT_TARGET = 500;

function statusClass(tone: StatusTone) {
  if (tone === "success") return "text-xs text-emerald-400";
  if (tone === "error") return "text-xs text-rose-400";
  return "text-xs text-muted-foreground";
}

async function fetchSettings(): Promise<SettingsPayload | null> {
  const response = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      kind: "read",
      table: "user_settings",
      columns: "monthly_savings_target,use_compact_currency",
      filters: [],
      orders: [],
      singleMode: "maybeSingle",
    }),
  });

  const payload = (await response.json()) as {
    data: SettingsPayload | null;
    error: { message: string } | null;
  };

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Failed to load settings");
  }

  return payload.data;
}

async function saveSettings(next: SettingsPayload) {
  const response = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      kind: "write",
      table: "user_settings",
      operation: "upsert",
      values: next,
      singleMode: "maybeSingle",
    }),
  });

  const payload = (await response.json()) as {
    data: unknown;
    error: { message: string } | null;
  };

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Failed to save settings");
  }
}

export default function AccountSettingsProfilePage() {
  const [monthlySavingsTarget, setMonthlySavingsTarget] = useState(String(DEFAULT_TARGET));
  const [useCompactCurrency, setUseCompactCurrency] = useState(true);
  const [theme, setTheme] = useState<DashboardTheme>("dark");
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("neutral");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await fetchSettings();
        if (!isMounted) return;
        if (data?.monthly_savings_target != null) {
          setMonthlySavingsTarget(String(Number(data.monthly_savings_target)));
        }
        if (data?.use_compact_currency != null) {
          setUseCompactCurrency(Boolean(data.use_compact_currency));
        }
      } catch {
        if (!isMounted) return;
        setStatusText("Could not load settings. You can still save new values.");
        setStatusTone("error");
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTheme = window.localStorage.getItem("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedTarget = Number(monthlySavingsTarget);

    if (!Number.isFinite(parsedTarget) || parsedTarget < 0) {
      setStatusText("Enter a valid monthly target.");
      setStatusTone("error");
      return;
    }

    try {
      setIsSaving(true);
      setStatusText("Saving...");
      setStatusTone("neutral");

      await saveSettings({
        monthly_savings_target: parsedTarget,
        use_compact_currency: useCompactCurrency,
      });

      window.dispatchEvent(
        new CustomEvent("budget:settings-updated", {
          detail: {
            monthlySavingsTarget: parsedTarget,
            useCompactCurrency: useCompactCurrency,
          },
        })
      );

      setStatusText("Settings saved.");
      setStatusTone("success");
    } catch {
      setStatusText("Could not save settings. Please try again.");
      setStatusTone("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeToggle = () => {
    const nextTheme: DashboardTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", nextTheme);
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      window.dispatchEvent(
        new CustomEvent("budget:theme-updated", {
          detail: { theme: nextTheme },
        })
      );
    }
  };

  return (
    <div className="space-y-4 p-1 text-sm text-foreground">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">Settings</h3>
        <p className="text-xs text-muted-foreground">
          Update your monthly savings target and display preferences.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="profile-monthly-savings-target"
            className="block text-sm font-medium text-muted-foreground"
          >
            Monthly Savings Target
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-muted-foreground sm:text-sm">Rs&nbsp;</span>
            </div>
            <input
              id="profile-monthly-savings-target"
              type="number"
              step="0.01"
              min={0}
              value={monthlySavingsTarget}
              disabled={isLoading || isSaving}
              onChange={(event) => setMonthlySavingsTarget(event.target.value)}
              className="block w-full rounded-md border-border bg-card pl-10 pr-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        <label
          htmlFor="profile-compact-currency-toggle"
          className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-card/70 px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-foreground">Compact currency</p>
            <p className="text-xs text-muted-foreground">
              Show summary amounts as K/M abbreviations.
            </p>
          </div>
          <div className="flex items-center">
            <input
              id="profile-compact-currency-toggle"
              type="checkbox"
              disabled={isLoading || isSaving}
              checked={useCompactCurrency}
              onChange={(event) => setUseCompactCurrency(event.target.checked)}
              className="sr-only peer"
            />
            <div className="relative h-6 w-11 rounded-full border border-border bg-muted/60 transition-colors peer-checked:bg-accent/80 peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
          </div>
        </label>

        <label
          htmlFor="profile-theme-toggle"
          className="md:hidden flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-card/70 px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-foreground">Theme</p>
            <p className="text-xs text-muted-foreground">Switch dark and light mode.</p>
          </div>
          <div className="flex items-center">
            <input
              id="profile-theme-toggle"
              type="checkbox"
              checked={theme === "dark"}
              onChange={handleThemeToggle}
              className="sr-only peer"
            />
            <div className="relative h-6 w-11 rounded-full border border-border bg-muted/60 transition-colors peer-checked:bg-accent/80 peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
          </div>
        </label>

        <div className="space-y-2">
          <button
            type="submit"
            disabled={isLoading || isSaving}
            className="btn-primary rounded-md border border-border/70 px-4 py-2 shadow-sm transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
          <p className={statusClass(statusTone)}>{statusText}</p>
        </div>
      </form>
    </div>
  );
}

