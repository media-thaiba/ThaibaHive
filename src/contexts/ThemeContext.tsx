"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}


function applyThemeToDOM(resolvedTheme: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolvedTheme === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The pre-paint script in app/layout.tsx has already set .dark / color-scheme
  // before first paint. These effects must not overwrite that with the
  // "dark" default for a frame while localStorage is being read.
  const hydrationPendingRef = useRef(true);
  const [theme, setThemeState] = useState<Theme>("dark");

  const systemTheme = useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    getSystemTheme,
    getSystemTheme
  );

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  // Mount: adopt the persisted theme and apply it in this same commit.
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      if (stored !== theme) setThemeState(stored);
      else hydrationPendingRef.current = false;
      applyThemeToDOM(resolveTheme(stored));
    } else {
      hydrationPendingRef.current = false;
      applyThemeToDOM(resolveTheme(theme));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Post-hydration: keep the DOM in sync with every subsequent change.
  useEffect(() => {
    if (hydrationPendingRef.current) {
      hydrationPendingRef.current = false;
      return;
    }
    applyThemeToDOM(resolvedTheme);
  }, [resolvedTheme]);

  const handleSetTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    applyThemeToDOM(resolveTheme(newTheme));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
