import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

const LS_KEY = "rc-theme"; // 'light' | 'dark'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Función única para aplicar el tema
  const applyTheme = (mode: "light" | "dark") => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    localStorage.setItem(LS_KEY, mode);
  };

  // Al montar, aplicar el guardado o usar "dark" por defecto
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY) as "light" | "dark" | null;
    const initial = saved === "light" || saved === "dark" ? saved : "dark";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  // Sincronizar entre pestañas ( se mantiene)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === LS_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        setTheme(e.newValue);
        applyTheme(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Al hacer click
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="h-9 w-9 grid place-items-center rounded-lg border rc-border rc-border 
                 rc-card hover:bg-gray-100 dark:hover:bg-gray-800 
                 transition-colors duration-200"
      title={theme === "dark" ? "Cambiar a claro" : "Cambiar a oscuro"}
    >
      {theme === "dark" ? <FiSun className="text-yellow-400" /> : <FiMoon className="text-gray-700" />}
    </button>
  );
}
