"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Pref = "dark" | "light" | "system";
const KEY = "bharatai-theme";
const EVT = "bharatai-theme-change";
const ORDER: Pref[] = ["dark", "light", "system"];

function applyTheme(pref: Pref) {
  const resolved = pref === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : pref;
  document.documentElement.setAttribute("data-theme", resolved);
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVT, cb);
  };
}

function getSnapshot(): Pref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "system" ? v : "dark";
  } catch {
    return "dark";
  }
}

export function ThemeToggle() {
  const pref = useSyncExternalStore(subscribe, getSnapshot, () => "dark" as Pref);

  // Keep "system" in sync with the OS setting.
  useEffect(() => {
    applyTheme(pref);
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
  const Icon = pref === "dark" ? Moon : pref === "light" ? Sun : Monitor;

  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.setItem(KEY, next);
        } catch {}
        window.dispatchEvent(new Event(EVT));
      }}
      aria-label={`Theme: ${pref}. Switch to ${next}.`}
      title={`Theme: ${pref}`}
      className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-foreground"
    >
      <Icon size={18} aria-hidden />
    </button>
  );
}
