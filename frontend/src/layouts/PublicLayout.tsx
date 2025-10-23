import { Outlet, Link } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-app text-base-clr">
      <header className="bg-surface border-b border-soft">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" className="h-8 w-8" alt="Real Connect" />
            <span className="font-semibold">Real Connect</span>
          </div>

          <nav className="flex items-center gap-3 text-sm">
            <Link className="hover:underline" to="/login">
              Iniciar sesión
            </Link>
            <Link
              className="inline-flex items-center rounded-md px-3 py-1.5 bg-[var(--primary)] text-white hover:opacity-90 transition"
              to="/register"
            >
              Registrarse
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
