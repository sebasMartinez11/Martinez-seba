import { NavLink } from "react-router-dom"; // Para los enlaces de navegación dentro del router
import {
  LayoutDashboard,
  Building2,
  Contact,
  ChevronLeft,
  ChevronRight,
  Settings,
  Bell,
} from "lucide-react"; // Íconos de lucide-react
import clsx from "clsx"; // Permite concatenar clases condicionalmente de forma limpia
import { useLocalStorage } from "@/hooks/useLocalStorage"; // Hook personalizado que guarda valores en localStorage


// Tipo para cada ítem del menú

type Item = {
  to: string; // Ruta de destino (path)
  label: string; // Nombre visible del ítem
  icon: React.ComponentType<{ className?: string }>; // Icono a mostrar
  badge?: number | string; // Valor opcional (por ejemplo: cantidad de avisos)
};


// Ítems visibles del menú lateral (Sidebar)

const items: Item[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/leads", label: "Leads", icon: Contact },
  { to: "/app/propiedades", label: "Propiedades", icon: Building2 },
  { to: "/app/avisos", label: "Recordatorios y avisos", icon: Bell },
  { to: "/app/configuracion", label: "Configuración", icon: Settings },
];


// Componente principal: Sidebar (barra lateral izquierda)

export default function Sidebar() {
  // Guarda en localStorage si el sidebar está colapsado o no (booleano)
  const [collapsed, setCollapsed] = useLocalStorage<boolean>(
    "rc_sidebar_collapsed",
    false
  );

  // Ancho dinámico según estado (colapsado o expandido)
  const width = collapsed ? "w-[76px]" : "w-64";

  return (
    
    <aside
      className={clsx(
        "sticky top-0 hidden md:flex h-[100dvh] shrink-0 flex-col transition-all duration-300 ease-in-out",
        "rc-card", // fondo + borde dinámicos según tema
        width // ancho según colapsado o no
      )}
    >
      {/* CABECERA SUPERIOR (logo + botón colapsar) */}
      <div className="flex items-center gap-3 px-3 py-4 border-b rc-border">
        {/* Logo del sistema */}
        <img src="/logo.png" alt="Real Connect" className="h-12 md:h-16 w-auto mx-auto"/>

        {/* Nombre visible solo cuando NO está colapsado */}
        {!collapsed && (
          <div className="font-semibold leading-tight">
            <div className="text-sm rc-text">Real Connect</div>
            <div className="text-[10px] rc-muted">CRM Inmobiliario</div>
          </div>
        )}

        {/* Botón de colapsar/expandir sidebar */}
        <button
          aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"} // accesibilidad
          aria-expanded={!collapsed}
          className={clsx(
            "ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md border rc-border", // contorno del botón
            "bg-[rgb(var(--card))] rc-text hover:bg-[rgb(var(--card))/0.9]", // fondo adaptado al tema
            "focus:outline-none focus:ring-2 focus:ring-blue-500/50" // anillo de foco visible
          )}
          onClick={() => setCollapsed((c) => !c)} // alterna el estado
          title={collapsed ? "Expandir" : "Colapsar"} // tooltip informativo
        >
          {/* Icono dinámico según estado */}
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/*MENÚ DE NAVEGACIÓN PRINCIPAL */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to} // clave única por ruta
              to={it.to}
              end={it.to === "/app"} // para el dashboard, coincide solo ruta exacta
              className={({ isActive }) =>
                clsx(
                  // Base: disposición + tipografía
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  // Accesibilidad (foco con teclado)
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
                  // Estado normal (no activo)
                  "rc-muted hover:bg-[rgb(var(--card))/0.6] hover:rc-text",
                  // Estado activo (página actual)
                  isActive && "bg-[rgb(var(--card))] rc-text border rc-border"
                )
              }
            >
              {/* Icono del ítem */}
              <Icon className="h-5 w-5 shrink-0" />

              {/* Texto visible solo si el sidebar está expandido */}
              {!collapsed && <span className="truncate">{it.label}</span>}

              {/* Ejemplo: badge opcional (número o etiqueta) */}
              {/* {it.badge && (
                <span className="ml-auto inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1 text-[10px] bg-blue-600 text-white">
                  {it.badge}
                </span>
              )} */}
            </NavLink>
          );
        })}
      </nav>

<<<<<<< HEAD
      {/*PIE DEL SIDEBAR (versión)*/}
      <div className="px-3 py-3 text-[10px] rc-muted border-t rc-border">
        {/* Muestra diferente texto si está colapsado */}
        {collapsed ? "v0.1" : "v0.1 • Dev"}
=======
      <div className="px-3 py-3 text-[10px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
        {collapsed ? "Version beta" : "Innovasoft"}
>>>>>>> dee6bb0193a32c205bd203c3b55914e3e67a801d
      </div>
    </aside>
  );
}
