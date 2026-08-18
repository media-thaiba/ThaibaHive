"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LoginHeader } from "./_components/login-header";
import { LoginForm } from "./_components/login-form";
import type { AuthMode } from "./_components/login-header";

const modeThemes = {
  signin: {
    accent: "#2ea44f",
    borderClass: "border-[#2ea44f]/25",
    shadowClass: "shadow-[#2ea44f]/5",
    subtitle: "CONNECTING TO THAIBAHIVE SECURE NODE",
  },
  signup: {
    accent: "#8bc34a",
    borderClass: "border-[#8bc34a]/25",
    shadowClass: "shadow-[#8bc34a]/5",
    subtitle: "ENROLLING SECURE USER NODE",
  },
  google: {
    accent: "#4285f4",
    borderClass: "border-[#4285f4]/25",
    shadowClass: "shadow-[#4285f4]/5",
    subtitle: "SYNCHRONIZING IDENTITY PROVIDER",
  },
  forgot: {
    accent: "#f59e0b",
    borderClass: "border-[#f59e0b]/25",
    shadowClass: "shadow-[#f59e0b]/5",
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
    <div className="flex min-h-screen items-center justify-center bg-[#070809] p-4 font-sans select-none transition-colors duration-500">
      <div className="w-full max-w-[440px]">
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className={`relative overflow-hidden bg-[#0e1012] border ${activeTheme.borderClass} rounded-[24px] shadow-2xl ${activeTheme.shadowClass} p-8 sm:p-9 space-y-6 transition-all duration-500`}
        >
          <LoginHeader mode={mode} activeTheme={activeTheme} />
          
          <LoginForm mode={mode} handleModeChange={handleModeChange} activeTheme={activeTheme} />

          <div className="space-y-4 pt-1">
            {mode === "signin" && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => handleModeChange("forgot")}
                  className="text-xs text-[#2ea44f] hover:underline font-bold transition-all"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <div className="border-t border-zinc-800/85 pt-4 text-center space-y-0.5">
              <p className="text-[10px] text-zinc-600 font-medium tracking-wide">
                ThaibaHive secure workspace access protocols are active.
              </p>
              <p className="text-[10px] text-zinc-600 font-medium tracking-wide">
                Authorized connections only.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
