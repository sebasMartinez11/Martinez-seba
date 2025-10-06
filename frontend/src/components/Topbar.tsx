import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import ThemeToggle from "@/components/ThemeToggle";

type Evento = {
  id: number;
  tipo?: string;
  fecha_hora?: string;
  propiedad?: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  notas?: string;
};

type Propiedad = {
  id: number;
  titulo?: string;
  direccion?: string;
  estado?: string | null;
  disponibilidad?: string | null;
};

type Usuario = {
  id: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
};

type SearchItem =
  | { type: "evento"; id: number; title: string; subtitle?: string }
  | { type: "propiedad"; id: number; title: string; subtitle?: string }
  | { type: "usuario"; id: number; title: string; subtitle?: string };

function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function Topbar({ title }: { title: string }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("rc_token") || "";
  const headers = useMemo(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query, 300);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Cerrar popover al click fuera / Esc
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Buscar cuando q cambia (mín 2 chars)
  useEffect(() => {
    async function run() {
      const text = q.trim();
      if (text.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);

      // Intento de server-side search (?search=) y si no, filtro en front
      try {
        const [evRes, prRes, usRes] = await Promise.all([
          fetch(`/api/eventos/?search=${encodeURIComponent(text)}`, { headers }),
          fetch(`/api/propiedades/?search=${encodeURIComponent(text)}`, { headers }),
          fetch(`/api/usuarios/`, { headers }), // Lista completa; tu vista no expone search: filtro en front
        ]);

        const eventos: Evento[] = evRes.ok ? await evRes.json() : [];
        const propiedades: Propiedad[] = prRes.ok ? await prRes.json() : [];
        const usuarios: Usuario[] = usRes.ok ? await usRes.json() : [];

        // Filtro en front por si el backend no soporta ?search=
        const needle = text.toLowerCase();

        const eventosF = (Array.isArray(eventos) ? eventos : [])
          .filter((e) =>
            [e.tipo, e.nombre, e.apellido, e.email, e.notas]
              .filter(Boolean)
              .some((s) => String(s).toLowerCase().includes(needle))
          )
          .slice(0, 5)
          .map<SearchItem>((e) => ({
            type: "evento",
            id: e.id,
            title: `${e.tipo ?? "Evento"} ${e.nombre ? `• ${e.nombre}` : ""}`.trim(),
            subtitle: e.fecha_hora ? new Date(e.fecha_hora).toLocaleString() : undefined,
          }));

        const propiedadesF = (Array.isArray(propiedades) ? propiedades : [])
          .filter((p) =>
            [p.titulo, p.direccion, p.estado, p.disponibilidad]
              .filter(Boolean)
              .some((s) => String(s).toLowerCase().includes(needle))
          )
          .slice(0, 5)
          .map<SearchItem>((p) => ({
            type: "propiedad",
            id: p.id,
            title: p.titulo || `Propiedad #${p.id}`,
            subtitle: [p.estado, p.disponibilidad].filter(Boolean).join(" • ") || undefined,
          }));

        const usuariosF = (Array.isArray(usuarios) ? usuarios : [])
          .filter((u) =>
            [u.nombre, u.apellido, u.email, u.telefono]
              .filter(Boolean)
              .some((s) => String(s).toLowerCase().includes(needle))
          )
          .slice(0, 5)
          .map<SearchItem>((u) => ({
            type: "usuario",
            id: u.id,
            title: [u.nombre, u.apellido].filter(Boolean).join(" ") || `Usuario #${u.id}`,
            subtitle: u.email,
          }));

        setResults([...eventosF, ...propiedadesF, ...usuariosF]);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [q, headers]);

  function onSelect(item: SearchItem) {
    setOpen(false);
    // Navegación simple por módulo (sin páginas de detalle aún)
    if (item.type === "propiedad") navigate("/app/propiedades");
    else if (item.type === "usuario") navigate("/app/usuarios");
    else navigate("/app"); // eventos → dashboard
  }

  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <div className="relative" ref={wrapRef}>
          <div className="relative">
            <FiSearch className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              placeholder="Buscar (eventos, propiedades, usuarios)…"
              className="w-72 h-9 rounded-lg border border-gray-300 dark:border-gray-700 pl-9 pr-3 text-sm bg-white dark:bg-gray-950 focus:ring-2 focus:ring-blue-500"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
            />
          </div>

          {/* Dropdown de resultados */}
          {open && (loading || results.length > 0 || q.trim().length >= 2) && (
            <div className="absolute z-50 mt-1 w-[28rem] rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
              <div className="max-h-80 overflow-auto">
                {loading && (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Buscando…</div>
                )}

                {!loading && q.trim().length >= 2 && results.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Sin coincidencias
                  </div>
                )}

                {!loading &&
                  results.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => onSelect(r)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-900"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.title}</span>
                        <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {r.type}
                        </span>
                      </div>
                      {r.subtitle && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{r.subtitle}</div>
                      )}
                    </button>
                  ))}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-800 p-2 text-right">
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Mínimo 2 caracteres • Enter para buscar
                </span>
              </div>
            </div>
          )}
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}
