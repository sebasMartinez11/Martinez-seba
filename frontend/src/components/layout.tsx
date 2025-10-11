// src/components/layout.tsx
import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle"; 

export function Layout({ title, children }: { title: string; children: ReactNode }) {
  const { pathname } = useLocation();

  const NavItem = ({ to, label }: { to: string; label: string }) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={[
          "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-blue-600 rc-text rc-text"
            : "text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 rc-text dark:hover:bg-gray-800",
        ].join(" ")}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen rc-bg bg-white rc-text  dark:bg-gray-950 rc-text transition-colors duration-300">
      {/* Topbar */}
      <header className="sticky top-0 z-20 border-b rc-border rc-border bg-white/70 dark:bg-neutral-900/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{title}</h1>

          {/* Acciones a la derecha */}
          <div className="flex items-center gap-3">
            
            <ThemeToggle /> {/* ☀️/🌙 Cambiar tema */}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
          <nav className="space-y-2">
            <NavItem to="/" label="Dashboard" />
            <NavItem to="/leads" label="Leads" />
            <NavItem to="/propiedades" label="Propiedades" />
            <NavItem to="/usuarios" label="Usuarios" />
          </nav>
        </aside>

        {/* Contenido */}
        <main className="col-span-12 md:col-span-9 lg:col-span-10">
          {children}
        </main>
      </div>
    </div>
  );
}
