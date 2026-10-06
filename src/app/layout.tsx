import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/platform/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevPath — Masterclass, Roadmaps, Courses, Resources & Simulators",
  description:
    "A learning platform for developers: deep masterclasses, career roadmaps, focused mini courses, practical guides and interactive simulators — five content types, one cohesive system.",
  applicationName: "DevPath",
  authors: [{ name: "DevPath" }],
  keywords: [
    "developer learning platform",
    "masterclass",
    "career roadmaps",
    "mini courses",
    "developer resources",
    "simulators",
  ],
  openGraph: {
    title: "DevPath",
    description:
      "Masterclass → Roadmaps → Courses → Resources → Simulators. One cohesive developer learning system.",
    type: "website",
    siteName: "DevPath",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
