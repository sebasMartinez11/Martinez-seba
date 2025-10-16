import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

export function Layout({ title, children }: { title: string; children: ReactNode }) {
  const { pathname } = useLocation();

  const NavItem = ({ to, label }: { to: string; label: string }) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={`block rounded-lg px-3 py-2 text-sm font-medium
          ${active ? "bg-blue-600 text-white" : "text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-gray-100">
      {/* Navbar (título de sección) */}
      <header className="sticky top-0 z-20 border-b border-gray-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <h1 className="text-xl font-semibold">{title}</h1>
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
