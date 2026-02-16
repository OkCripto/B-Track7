import { Inter } from "next/font/google";
import DashboardClient from "../DashboardClient";

const inter = Inter({ subsets: ["latin"] });

export default function DashboardSettingsPage() {
  return (
    <DashboardClient fontClassName={inter.className} initialPage="settings" />
  );
}
