"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { dashboardMarkup } from "./dashboardMarkup";
import { initBudgetDashboard } from "./initBudgetDashboard";

type DashboardClientProps = {
  fontClassName?: string;
  initialPage?: "tracker" | "assets" | "all-transactions" | "analytics";
};

export default function DashboardClient({
  fontClassName = "",
  initialPage,
}: DashboardClientProps) {
  const [chartsReady, setChartsReady] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!chartsReady || initializedRef.current) return;
    initializedRef.current = true;
    initBudgetDashboard({ initialPage });
  }, [chartsReady]);

  return (
    <div className={`budget-dashboard min-h-screen antialiased ${fontClassName}`.trim()}>
      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js"
        strategy="afterInteractive"
        onLoad={() => setChartsReady(true)}
      />
      <div dangerouslySetInnerHTML={{ __html: dashboardMarkup }} />
    </div>
  );
}
