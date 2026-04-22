import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react"
import { PageViewTracker } from "@/components/page-view-tracker"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
const metadataBase = appUrl
  ? new URL(appUrl.startsWith("http") ? appUrl : `https://${appUrl}`)
  : new URL("http://localhost:3000")

export const metadata: Metadata = {
  metadataBase,
  title: "Alianah Humanity Welfare",
  description: "Support our appeals and make a difference with your donation",
  icons: {
    icon: [
      { url: "/logo-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/logo-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: "/logo-light.png",
    apple: "/logo-light.png",
  },
  openGraph: {
    title: "Alianah Humanity Welfare",
    description: "Support our appeals and make a difference with your donation",
    url: "https://give.alianah.org",
    siteName: "Alianah Humanity Welfare",
    images: [
      {
        url: "/preview.png",
        width: 1200,
        height: 630,
        alt: "Alianah Humanity Welfare",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alianah Humanity Welfare",
    description: "Support our appeals and make a difference with your donation",
    images: ["/preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          storageKey="theme"
          value={{ dark: "dark", light: "light" }}
        >
          {children}
          <PageViewTracker />
          <Analytics />
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
