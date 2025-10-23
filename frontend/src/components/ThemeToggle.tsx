import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

const LS_KEY = "rc-theme"; // 'light' | 'dark'

function getInitialTheme(): "light" | "dark" {
  const rootHasDark = document.documentElement.classList.contains("dark");
  if (rootHasDark) return "dark";
  const saved = localStorage.getItem(LS_KEY);
  if (saved === "light" || saved === "dark") return saved;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(next: "light" | "dark") {
  const root = document.documentElement; // <html>
  root.classList.toggle("dark", next === "dark");
  root.setAttribute("data-theme", next); // por si querés leerlo en CSS
  localStorage.setItem(LS_KEY, next);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sincronizar entre pestañas + con el sistema operativo
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onSystem = (e: MediaQueryListEvent) => {
      // Solo seguir al sistema si el usuario no guardó preferencia manual (no hay LS)
      if (!localStorage.getItem(LS_KEY)) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    mq?.addEventListener?.("change", onSystem);

    return () => {
      window.removeEventListener("storage", onStorage);
      mq?.removeEventListener?.("change", onSystem);
    };
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    // applyTheme(next) lo hace el useEffect([theme])
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === "dark"}
      title={theme === "dark" ? "Cambiar a claro" : "Cambiar a oscuro"}
      aria-label="Cambiar tema"
      className="
        h-9 w-9 grid place-items-center rounded-xl
        bg-surface hover:bg-surface-2
        border border-soft
        shadow-elev-1 transition
      "
    >
      {theme === "dark" ? (
        <FiSun className="text-muted-clr" />
      ) : (
        <FiMoon className="text-muted-clr" />
      )}
    </button>
  );
}
