"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "../ui/Button";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "light" ? "dark" : "light";

  return (
    <Button
      aria-label={showLabel ? `Theme: switch to ${nextTheme} mode` : `Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
      onClick={toggleTheme}
      size="icon"
      variant="outline"
      className={showLabel ? "theme-toggle-labeled" : ""}
    >
      {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
      {showLabel && <span>Theme</span>}
    </Button>
  );
}
