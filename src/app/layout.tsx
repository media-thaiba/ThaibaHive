import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { NONCE_REQUEST_HEADER_NAME } from "@/lib/security/security-headers";
import { Providers } from "@/components/layout/Providers";
import { PwaRegistrar } from "@/components/pwa-registrar";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "ThaibaHive — Staff Management Platform",
  description:
    "Comprehensive staff management for Thaiba Garden Group of Institutions",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/Logo/thl_logo.png", type: "image/png" },
    ],
    shortcut: "/Logo/thl_logo.png",
    apple: "/Logo/thl_logo_apple.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ThaibaHive",
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get(NONCE_REQUEST_HEADER_NAME) ?? "";

  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        {nonce ? <meta name="csp-nonce" content={nonce} /> : null}
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <PwaRegistrar />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
