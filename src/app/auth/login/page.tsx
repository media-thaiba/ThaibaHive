"use client";

import React, { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, ShieldCheck, CheckCircle2 } from "lucide-react";
import { LoginHeader } from "./_components/login-header";
import { LoginForm } from "./_components/login-form";
import type { AuthMode } from "./_components/login-header";

// ── Theme definitions matching AuthMode (WCAG AA >= 4.5:1 with #ffffff text) ──
const modeThemes = {
  signin: {
    accent: "#047857",
    borderClass: "border-primary/25",
    shadowClass: "shadow-primary/5",
    subtitle: "CONNECTING TO THAIBAHIVE SECURE NODE",
  },
  signup: {
    accent: "#047857",
    borderClass: "border-emerald-500/25",
    shadowClass: "shadow-emerald-500/5",
    subtitle: "ENROLLING SECURE USER NODE",
  },
  google: {
    accent: "#2563eb",
    borderClass: "border-blue-500/25",
    shadowClass: "shadow-blue-500/5",
    subtitle: "SYNCHRONIZING IDENTITY PROVIDER",
  },
  forgot: {
    accent: "#b45309",
    borderClass: "border-amber-500/25",
    shadowClass: "shadow-amber-500/5",
    subtitle: "RECOVERING SECURE NODE KEYS",
  },
};

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const shouldReduceMotion = useReducedMotion();

  // Read URL query params on mount to support direct links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode") as AuthMode;
    if (m === "signup" || m === "google" || m === "forgot") {
      setMode(m);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const m = params.get("mode") as AuthMode;
      if (m === "signup" || m === "google" || m === "forgot") {
        setMode(m);
      } else {
        setMode("signin");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    const url = new URL(window.location.href);
    url.searchParams.set("mode", newMode);
    window.history.pushState({}, "", url.toString());
  };

  const activeTheme = modeThemes[mode];

  return (
    <div
      className="login-page-frame dark min-h-screen w-full relative overflow-hidden flex flex-col justify-between bg-[#070b14] text-foreground select-none"
      style={{ colorScheme: "dark" }}
    >
      {/* Apple-style atmospheric depth & subtle vignette */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(1200px 800px at 50% 15%, rgba(16, 185, 129, 0.08), transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, transparent 60%, rgba(4, 7, 14, 0.6) 100%)",
          }}
        />
      </div>

      {/* Top Operational Status Bar */}
      <header className="relative z-20 w-full h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/40 bg-card/60 backdrop-blur-md text-xs font-medium text-muted-foreground shadow-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <Activity className="h-3 w-3 text-emerald-400" />
          <span>System Status: Operational</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>v2.6 Secure Node</span>
        </div>
      </header>

      {/* Main Content: Split Desktop / Centered Mobile Layout */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Calm, Institutional Brand Pillar (Desktop) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-6 pr-6">
            <div className="flex items-center gap-4">
              <img
                src="/Logo/thl_logo.svg"
                alt="Thaiba Garden Logo"
                width={64}
                height={64}
                className="h-16 w-16 object-contain rounded-2xl shadow-sm border border-white/10 p-1 bg-white/[0.04]"
              />
              <img
                src="/Logo/thl_name.svg"
                alt="ThaibaHive"
                width={180}
                height={40}
                className="h-9 w-auto object-contain"
              />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Unified Campus Operations & Academic OS
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
                The unified digital campus platform for Thaiba Garden Group of Institutions. Securely manage attendance, academic intelligence, staff administration, and operational governance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-w-lg">
              <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border/40 bg-card/40 backdrop-blur-md">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-foreground/90">Institutional ERP & Records</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border/40 bg-card/40 backdrop-blur-md">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-foreground/90">Multi-Tier RBAC Governance</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border/40 bg-card/40 backdrop-blur-md">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-foreground/90">Real-Time Academic Intelligence</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border/40 bg-card/40 backdrop-blur-md">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-foreground/90">Audit-Ready Cryptographic Logs</span>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="w-full lg:col-span-5 flex justify-center">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className={`w-full max-w-md relative overflow-hidden text-card-foreground border ${activeTheme.borderClass} rounded-2xl shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] ${activeTheme.shadowClass} p-6 sm:p-8 space-y-6`}
              style={{
                backgroundColor: "rgba(10, 15, 26, 0.94)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <div className="flex items-center justify-between pb-1 -mt-1 relative z-20">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400/90 tracking-wider uppercase">
                  <img src="/Logo/thl_logo.svg" alt="Logo" className="h-5 w-5 object-contain" />
                  <span>ThaibaHive</span>
                </div>
              </div>

              <LoginHeader mode={mode} activeTheme={activeTheme} />

              <LoginForm
                mode={mode}
                handleModeChange={handleModeChange}
                activeTheme={activeTheme}
              />

              <div className="border-t border-border/50 pt-4 text-center space-y-0.5">
                <p className="text-xs text-muted-foreground font-medium">
                  ThaibaHive secure workspace access protocols are active.
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  Authorized institutional personnel only.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-3 z-20 text-xs text-muted-foreground border-t border-white/5 shrink-0">
        <p className="text-xs" suppressHydrationWarning>
          &copy; 2026 Thaiba Garden Group of Institutions &bull; All Rights Reserved
        </p>
      </footer>
    </div>
  );
}
