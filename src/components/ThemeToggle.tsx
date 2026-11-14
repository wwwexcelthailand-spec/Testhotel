"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("rm_theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      if (stored === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("rm_theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  if (!mounted) {
    return (
      <div className="h-8 w-24 rounded-full bg-white/70 border border-[#eeeeee]" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="เปลี่ยนธีม สว่าง / มืด"
      title={theme === "dark" ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#dddddd] bg-white text-xs font-semibold text-[#222222] shadow-sm hover:bg-[#f5eef9] hover:text-[#5c2484] transition-all cursor-pointer select-none"
    >
      {theme === "dark" ? (
        <>
          <Sun className="w-3.5 h-3.5 text-[#ffc83b]" />
          <span className="hidden sm:inline">ธีมสว่าง</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-[#5c2484]" />
          <span className="hidden sm:inline">ธีมมืด</span>
        </>
      )}
    </button>
  );
}
