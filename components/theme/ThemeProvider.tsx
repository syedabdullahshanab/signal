"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getThemeSnapshot(): Theme {
  try {
    return window.localStorage.getItem("signal-theme") === "light" ? "light" : "dark";
  } catch (storageError) {
    console.warn("Could not read the saved theme.", storageError);
    return "dark";
  }
}

function subscribeToThemeChange(callback: () => void) {
  window.addEventListener("signal-theme-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("signal-theme-change", callback);
    window.removeEventListener("storage", callback);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeToThemeChange, getThemeSnapshot, () => "dark" as Theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    try {
      window.localStorage.setItem("signal-theme", nextTheme);
    } catch (storageError) {
      console.warn("Could not save the selected theme.", storageError);
    }
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new Event("signal-theme-change"));
  }

  const value: ThemeContextValue = { theme, toggleTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider.");
  return context;
}
