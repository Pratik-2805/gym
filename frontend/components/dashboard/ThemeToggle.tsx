"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Palette } from "lucide-react";

type Theme = "dark" | "coloured" | "light";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("fitflow-theme") as Theme;
    if (savedTheme === "dark" || savedTheme === "coloured" || savedTheme === "light") {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    setMounted(true);
  }, []);

  const changeTheme = (newTheme: Theme) => {
    // Inject a style block to disable all transitions temporarily during the theme switch
    const css = document.createElement("style");
    css.type = "text/css";
    css.appendChild(
      document.createTextNode(
        `* {
           -webkit-transition: none !important;
           -moz-transition: none !important;
           -o-transition: none !important;
           -ms-transition: none !important;
           transition: none !important;
         }`
      )
    );
    document.head.appendChild(css);

    // Apply the new theme
    setTheme(newTheme);
    localStorage.setItem("fitflow-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);

    // Force a reflow, flushing the CSS changes
    const _ = window.getComputedStyle(css).opacity;

    // Remove the style block after the repaint to restore normal hover transitions
    setTimeout(() => {
      document.head.removeChild(css);
    }, 20);
  };

  if (!mounted) {
    return <div className="w-28 h-9 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} />;
  }

  const isLight = theme === "light";

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl z-20 border"
      style={{
        background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
        borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
      }}
    >
      {/* Dark Button */}
      <button
        onClick={() => changeTheme("dark")}
        title="Dark Theme"
        className="p-1.5 rounded-lg transition-all"
        style={{
          background: theme === "dark" ? (isLight ? '#0f172a' : 'rgba(255,255,255,0.15)') : 'transparent',
          color: theme === "dark" ? (isLight ? '#ffffff' : '#e2e8f0') : (isLight ? '#334155' : '#71717a'),
        }}
      >
        <Moon className="w-3.5 h-3.5" />
      </button>

      {/* Coloured Button */}
      <button
        onClick={() => changeTheme("coloured")}
        title="Coloured Theme"
        className="p-1.5 rounded-lg transition-all"
        style={{
          background: theme === "coloured" ? (isLight ? '#0ea5e9' : 'rgba(255,255,255,0.15)') : 'transparent',
          color: theme === "coloured" ? (isLight ? '#ffffff' : '#38bdf8') : (isLight ? '#334155' : '#71717a'),
        }}
      >
        <Palette className="w-3.5 h-3.5" />
      </button>

      {/* Light Button */}
      <button
        onClick={() => changeTheme("light")}
        title="Light Theme"
        className="p-1.5 rounded-lg transition-all"
        style={{
          background: theme === "light" ? (isLight ? '#f59e0b' : 'rgba(255,255,255,0.15)') : 'transparent',
          color: theme === "light" ? (isLight ? '#ffffff' : '#fbbf24') : (isLight ? '#334155' : '#71717a'),
        }}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
