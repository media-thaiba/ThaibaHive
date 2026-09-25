"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LoginHeader } from "./_components/login-header";
import { LoginForm } from "./_components/login-form";
import type { AuthMode } from "./_components/login-header";

const modeThemes = {
  signin: {
    accent: "var(--primary)",
    borderClass: "border-primary/25",
    shadowClass: "shadow-primary/5",
    subtitle: "CONNECTING TO THAIBAHIVE SECURE NODE",
  },
  signup: {
    accent: "hsl(var(--success, 142 76% 36%))",
    borderClass: "border-emerald-500/25",
    shadowClass: "shadow-emerald-500/5",
    subtitle: "ENROLLING SECURE USER NODE",
  },
  google: {
    accent: "hsl(var(--info, 217 91% 60%))",
    borderClass: "border-blue-500/25",
    shadowClass: "shadow-blue-500/5",
    subtitle: "SYNCHRONIZING IDENTITY PROVIDER",
  },
  forgot: {
    accent: "hsl(var(--warning, 38 92% 50%))",
    borderClass: "border-amber-500/25",
    shadowClass: "shadow-amber-500/5",
    subtitle: "RECOVERING SECURE NODE KEYS",
  },
};

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("signin");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode") as AuthMode;
    if (m === "signup" || m === "google" || m === "forgot") {
      setMode(m);
    } else {
      setMode("signin");
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
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-4 font-sans select-none transition-colors duration-500">
      <div className="w-full max-w-[440px]">
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className={`relative overflow-hidden bg-card text-card-foreground border ${activeTheme.borderClass} rounded-[24px] shadow-2xl ${activeTheme.shadowClass} p-8 sm:p-9 space-y-6 transition-all duration-500`}
        >
          <LoginHeader mode={mode} activeTheme={activeTheme} />
          
          <LoginForm mode={mode} handleModeChange={handleModeChange} activeTheme={activeTheme} />

          <div className="space-y-4 pt-1">
            {mode === "signin" && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => handleModeChange("forgot")}
                  className="text-xs text-primary hover:underline font-bold transition-all"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <div className="border-t border-border pt-4 text-center space-y-0.5">
              <p className="text-[10px] text-muted-foreground font-medium tracking-wide">
                ThaibaHive secure workspace access protocols are active.
              </p>
              <p className="text-[10px] text-muted-foreground font-medium tracking-wide">
                Authorized connections only.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
