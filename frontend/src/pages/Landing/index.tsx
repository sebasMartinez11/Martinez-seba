import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <section className="py-16 md:py-24">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        {/* Izquierda */}
        <div className="space-y-6">
          {/* Chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs
                          border rc-border rc-border
                          rc-card
                          text-gray-700 dark:text-gray-300">
            Nuevo • Real Connect
          </div>

          {/* Título */}
          <h1 className="text-3xl md:text-5xl font-bold leading-tight
                         rc-text rc-text">
            El CRM inmobiliario que no te deja perder un lead.
          </h1>

          {/* Subtítulo */}
          <p className="text-lg rc-muted dark:text-gray-300">
            Centralizá contactos, propiedades y seguimientos en un solo lugar.
            Simple, rápido y listo para ejecutar.
          </p>

          {/* Acciones */}
          <div className="flex flex-wrap gap-3">
            {/* Primario */}
            <Link
              to="/register"
              className="inline-flex items-center rounded-md px-4 py-2
                         bg-blue-600 rc-text rc-text hover:bg-blue-700"
            >
              Registrarse
            </Link>

            {/* Secundario */}
            <Link
              to="/login"
              className="inline-flex items-center rounded-md px-4 py-2
                         border rc-border rc-border
                         rc-card
                         rc-text rc-text
                         hover:bg-[rgb(var(--card))/0.4]"
            >
              Iniciar sesión
            </Link>

            {/* Enlace */}
            <Link
              to="/app"
              className="inline-flex items-center rounded-md px-4 py-2 underline
                         text-gray-700 dark:text-gray-300 hover:no-underline"
            >
              Ver demo
            </Link>
          </div>

          {/* Bullets */}
          <ul className="text-sm rc-muted dark:text-gray-300 space-y-1">
            <li>• Gestión de leads con estados y seguimiento</li>
            <li>• Inventario de propiedades con imágenes</li>
            <li>• Panel con KPIs y actividad</li>
          </ul>
        </div>

        {/* Derecha */}
        <div className="rounded-2xl border rc-border rc-border p-6">
          <img src="/logo.png" alt="Real Connect" className="h-12 md:h-16 w-auto mx-auto"/>
          <div className="rounded-xl bg-gray-100 dark:bg-gray-900 h-64" />
          <p className="mt-3 text-xs rc-muted rc-muted">
            Mockup de app (ilustrativo)
          </p>
        </div>
      </div>
    </section>
  );
}
