import type { Metadata } from "next";
import { Geist_Mono, Playfair_Display, Sora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "B-Track7",
  description: "Budget tracking that feels alive with real-time guardrails and cashflow clarity.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: {
    title: "B-Track7",
    description: "Budget tracking that feels alive with real-time guardrails and cashflow clarity.",
    url: "/",
    siteName: "B-Track7",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "B-Track7",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "B-Track7",
    description: "Budget tracking that feels alive with real-time guardrails and cashflow clarity.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${sora.variable} ${playfair.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ClerkProvider
          appearance={{
            theme: shadcn,
            cssLayerName: "clerk",
            variables: {
              colorPrimary: "var(--accent)",
              colorText: "var(--foreground)",
              colorTextSecondary: "var(--muted-foreground)",
              colorBackground: "var(--card)",
              colorInputBackground: "var(--background)",
              colorInputText: "var(--foreground)",
              borderRadius: "0.75rem",
              fontFamily: "var(--font-sora)",
            },
          }}
        >
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
