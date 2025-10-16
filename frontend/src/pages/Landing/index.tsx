import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <section className="py-16 md:py-24">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs border border-gray-200 dark:border-gray-800">
            Nuevo • Real Connect
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            El CRM inmobiliario que no te deja perder un lead.
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Centralizá contactos, propiedades y seguimientos en un solo lugar.
            Simple, rápido y listo para ejecutar.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex items-center rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              Registrarse
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center rounded-md px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/app"
              className="inline-flex items-center rounded-md px-4 py-2 border border-transparent underline"
            >
              Ver demo
            </Link>
          </div>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Gestión de leads con estados y seguimiento</li>
            <li>• Inventario de propiedades con imágenes</li>
            <li>• Panel con KPIs y actividad</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <img src="/logo.png" alt="Real Connect" className="h-16 w-16 mb-4" />
          <div className="rounded-xl bg-gray-100 dark:bg-gray-800 h-64" />
          <p className="mt-3 text-xs text-gray-500">Mockup de app (ilustrativo)</p>
        </div>
      </div>
    </section>
  );
}
