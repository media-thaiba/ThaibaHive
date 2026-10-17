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
  themeColor: "#030305",
  colorScheme: "dark light",
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
        {/* Pre-paint theme + sidebar hydration.
            Runs before first paint so .dark / color-scheme / sidebar width are
            correct on the very first frame in every browser — no flash, and
            identical output regardless of engine-specific default timing. */}
        <script
          nonce={nonce || undefined}
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var r=document.documentElement;var t=null;try{t=localStorage.getItem("theme")}catch(e){}' +
              'var d=t==="dark"||!t||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);' +
              'r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";' +
              'var s=null;try{s=localStorage.getItem("sidebar-collapsed")}catch(e){}' +
              'if(s==="true"||(s===null&&window.innerWidth<1280)){r.setAttribute("data-sidebar-collapsed","true")}' +
              '}catch(e){}})();',
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <PwaRegistrar />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
