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
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}


function applyThemeToDOM(resolvedTheme: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolvedTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initializedRef = useRef(false);
  const [theme, setThemeState] = useState<Theme>("system");

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

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      applyThemeToDOM(resolveTheme(theme));
    }
  }, [theme]);

  useEffect(() => {
    applyThemeToDOM(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored && stored !== theme) {
      setThemeState(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
