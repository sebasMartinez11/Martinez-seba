import { Outlet, Link } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-50">
      <header className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" className="h-8 w-8" alt="Real Connect" />
          <span className="font-semibold">Real Connect</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link className="hover:underline" to="/login">Iniciar sesión</Link>
          <Link
            className="inline-flex items-center rounded-md px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700"
            to="/register"
          >
            Registrarse
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4">
        <Outlet />
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-10 text-xs text-gray-500">
        © {new Date().getFullYear()} Real Connect — CRM Inmobiliario
      </footer>
    </div>
  );
}
