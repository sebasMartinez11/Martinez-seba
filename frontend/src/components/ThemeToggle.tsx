import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

const LS_KEY = "rc-theme"; // 'light' | 'dark'

function applyTheme(next: "light" | "dark") {
  const root = document.documentElement;
  if (next === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  localStorage.setItem(LS_KEY, next);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem(LS_KEY) as "light" | "dark" | null) || "dark";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      onClick={toggle}
      className="h-9 w-9 grid place-items-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900"
      title="Cambiar tema"
    >
      {theme === "dark" ? <FiSun className="text-yellow-400" /> : <FiMoon className="text-gray-700" />}
    </button>
  );
}
