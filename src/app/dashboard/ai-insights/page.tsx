import { Inter } from "next/font/google";
import DashboardClient from "../DashboardClient";
import { loadAiInsightsClientProps } from "@/app/ai-insights/loadAiInsightsData";

const inter = Inter({ subsets: ["latin"] });

export default async function DashboardAiInsightsPage() {
  const aiInsightsData = await loadAiInsightsClientProps();

  return (
    <DashboardClient
      fontClassName={inter.className}
      initialPage="ai-insights"
      aiInsightsData={aiInsightsData}
    />
  );
}
