import { Outlet, Link } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";

export default function PublicLayout() {
  return (
    <div className="min-h-screen rc-bg rc-text transition-colors duration-300">
      <header className="sticky top-0 z-30 border-b rc-border bg-[rgb(var(--card))]/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" className="h-8 w-8" alt="Real Connect" />
            <span className="font-semibold">Real Connect</span>
          </div>

          <nav
            className="flex items-center gap-3 text-sm"
            aria-label="Navegación pública"
            role="navigation"
          >
            <Link
              to="/login"
              className="rc-muted hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded"
            >
              Iniciar sesión
            </Link>

            {/* Botón primario: color fijo, texto blanco siempre */}
            <Link
              to="/register"
              className="inline-flex items-center rounded-md px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700"
            >
              Registrarse
            </Link>

            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-10 text-xs rc-muted border-t rc-border">
      </footer>
    </div>
  );
}
