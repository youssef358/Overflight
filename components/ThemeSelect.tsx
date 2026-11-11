"use client";
import { useSyncExternalStore } from "react";

type Theme = "system" | "light" | "dark";

// The current theme lives on <html data-theme> (no attribute = follow the system).
// useSyncExternalStore reads it and re-renders the select when it changes.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readTheme(): Theme {
  const theme = document.documentElement.dataset.theme;
  return theme === "light" || theme === "dark" ? theme : "system";
}

function saveTheme(theme: Theme) {
  const root = document.documentElement;
  try {
    if (theme === "system") {
      delete root.dataset.theme;
      localStorage.removeItem("theme");
    } else {
      root.dataset.theme = theme;
      localStorage.setItem("theme", theme);
    }
  } catch {
    // Storage blocked: the theme still applies until the page is reloaded.
  }
  listeners.forEach((listener) => listener());
}

export function ThemeSelect() {
  // The server has no document: it renders "system", the browser then shows the real value.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system");

  return (
    <select
      aria-label="Theme"
      value={theme}
      onChange={(e) => saveTheme(e.target.value as Theme)}
      className="rounded-md border bg-background px-2 py-1 text-sm"
    >
      <option value="system">System theme</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
