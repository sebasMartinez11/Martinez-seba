import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiBell, FiAlertCircle, FiCalendar, FiClock } from "react-icons/fi";
import ThemeToggle from "@/components/ThemeToggle";

/* ===================== Tipos de datos usados en la búsqueda y avisos ===================== */
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

type AvisoItem = {
  id: number;
  nombre?: string;
  apellido?: string;
  last_contact_at?: string | null;
  next_contact_at?: string | null;
  next_contact_note?: string | null;
  proximo_contacto_estado?: string;
  dias_sin_seguimiento?: number | null;
  creado_en?: string;
};

type Bucket = { count: number; items: AvisoItem[] };

type AvisosPayload = {
  params: { recordame_cada: number; proximo_en_dias: number; limit: number };
  pendientes: Bucket;
  vencidos: Bucket;
  vence_hoy: Bucket;
  proximos: Bucket;
  sin_seguimiento: Bucket;
};

/* ===================== Hook simple de debounce ===================== */
function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

/* ===================== Componente principal ===================== */
export default function Topbar({ title }: { title: string }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("rc_token") || "";
  const headers = useMemo(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  /* --------- Estado del buscador --------- */
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query, 300);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  /* --------- Estado de la campana --------- */
  const [openBell, setOpenBell] = useState(false);
  const bellWrapRef = useRef<HTMLDivElement | null>(null);
  const [avisos, setAvisos] = useState<AvisosPayload | null>(null);
  const [loadingAvisos, setLoadingAvisos] = useState(false);
  const [errorAvisos, setErrorAvisos] = useState<string | null>(null);

  /* --------- Cerrar popovers con click afuera o Escape --------- */
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
      if (bellWrapRef.current && !bellWrapRef.current.contains(e.target as Node)) setOpenBell(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setOpenBell(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* --------- Buscar cuando cambia q (mínimo 2 caracteres) --------- */
  useEffect(() => {
    async function run() {
      const text = q.trim();
      if (text.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [evRes, prRes, usRes] = await Promise.all([
          fetch(`/api/eventos/?search=${encodeURIComponent(text)}`, { headers }),
          fetch(`/api/propiedades/?search=${encodeURIComponent(text)}`, { headers }),
          fetch(`/api/usuarios/`, { headers }),
        ]);

        const eventos: Evento[] = evRes.ok ? await evRes.json() : [];
        const propiedades: Propiedad[] = prRes.ok ? await prRes.json() : [];
        const usuarios: Usuario[] = usRes.ok ? await usRes.json() : [];

        const needle = text.toLowerCase();
        const eventosF = eventos
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

        const propiedadesF = propiedades
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

        const usuariosF = usuarios
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

  /* --------- Navegación al elegir un resultado --------- */
  function onSelect(item: SearchItem) {
    setOpen(false);
    if (item.type === "propiedad") navigate("/app/propiedades");
    else if (item.type === "usuario") navigate("/app/usuarios");
    else navigate("/app");
  }

  /* --------- Fetch de avisos --------- */
  async function fetchAvisos() {
    if (!token) return;
    setLoadingAvisos(true);
    setErrorAvisos(null);
    try {
      const res = await fetch(`/api/contactos/avisos/?recordame_cada=3&proximo_en_dias=3&limit=10`, { headers });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data: AvisosPayload = await res.json();
      setAvisos(data);
    } catch {
      setErrorAvisos("No se pudieron cargar los avisos.");
      setAvisos(null);
    } finally {
      setLoadingAvisos(false);
    }
  }

  useEffect(() => {
    fetchAvisos();
    const id = setInterval(fetchAvisos, 60000);
    return () => clearInterval(id);
  }, [token]);

  const totalAvisos =
    (avisos?.pendientes.count ?? 0) +
    (avisos?.vencidos.count ?? 0) +
    (avisos?.vence_hoy.count ?? 0) +
    (avisos?.proximos.count ?? 0) +
    (avisos?.sin_seguimiento.count ?? 0);

  function goAvisos() {
    setOpenBell(false);
    navigate("/app/avisos");
  }

  function goLeadsWith(opts: {
    vencimiento?: "pendiente" | "vencido" | "hoy" | "proximo";
    sin?: number | string;
    proximo_en_dias?: number | string;
  }) {
    const params = new URLSearchParams();
    if (opts.vencimiento) params.set("vencimiento", String(opts.vencimiento));
    if (typeof opts.sin !== "undefined" && opts.sin !== "") params.set("sin", String(opts.sin));
    if (typeof opts.proximo_en_dias !== "undefined") params.set("proximo_en_dias", String(opts.proximo_en_dias));
    setOpenBell(false);
    navigate(`/app/leads?${params.toString()}`);
  }

  /* --------- Render --------- */
  return (
    <header className="flex items-center justify-between p-4 border-b rc-border">
      <h1 className="text-xl font-semibold rc-text">{title}</h1>

      <div className="flex items-center gap-3">
        {/* ------- Search ------- */}
        <div className="relative" ref={wrapRef}>
          <div className="relative">
            <FiSearch className="absolute left-3 top-2.5 rc-muted pointer-events-none" />
            <input
              placeholder="Buscar (eventos, propiedades, usuarios)…"
              className="rc-input w-72 pl-9 pr-3"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
            />
          </div>

          {open && (loading || results.length > 0 || q.trim().length >= 2) && (
            <div className="absolute z-50 mt-1 w-[28rem] rounded-lg rc-card shadow-lg">
              <div className="max-h-80 overflow-auto">
                {loading && <div className="px-3 py-2 text-sm rc-muted">Buscando…</div>}
                {!loading && q.trim().length >= 2 && results.length === 0 && (
                  <div className="px-3 py-2 text-sm rc-muted">Sin coincidencias</div>
                )}
                {!loading &&
                  results.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => onSelect(r)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-app/5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium rc-text">{r.title}</span>
                        <span className="text-[10px] uppercase tracking-wide rc-muted">{r.type}</span>
                      </div>
                      {r.subtitle && <div className="text-xs rc-muted">{r.subtitle}</div>}
                    </button>
                  ))}
              </div>

              <div className="border-t rc-border p-2 text-right">
                <span className="text-[11px] rc-muted">Mínimo 2 caracteres • Enter para buscar</span>
              </div>
            </div>
          )}
        </div>

        {/* ------- Campana de avisos ------- */}
        <div className="relative" ref={bellWrapRef}>
          <button
            className="relative h-9 w-9 grid place-items-center rounded-lg border rc-border bg-surface"
            onClick={() => setOpenBell((v) => !v)}
            title="Recordatorios y avisos"
          >
            <FiBell className="text-lg rc-text" />
            {totalAvisos > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] grid place-items-center">
                {totalAvisos > 99 ? "99+" : totalAvisos}
              </span>
            )}
          </button>

          {openBell && (
            <div className="absolute right-0 mt-2 w-[26rem] z-[60] rounded-xl border rc-border bg-surface shadow-elev-1 overflow-hidden">
              <div className="px-3 py-2 border-b rc-border flex items-center justify-between">
                <div className="text-sm font-medium rc-text">Recordatorios y avisos</div>
                <button className="text-xs underline rc-text" onClick={goAvisos}>
                  Ver todos
                </button>
              </div>

              <div className="max-h-96 overflow-auto">
                {loadingAvisos && <div className="px-3 py-2 text-sm rc-muted">Cargando…</div>}
                {errorAvisos && !loadingAvisos && (
                  <div className="px-3 py-2 text-sm text-rose-500">{errorAvisos}</div>
                )}
                {!loadingAvisos && !errorAvisos && avisos && (
                  <div className="divide-y rc-border/50">
                    <BucketSmall icon={<FiAlertCircle />} label="Vencidos" items={avisos.vencidos.items} emptyText="Sin vencidos" onSee={() => goLeadsWith({ vencimiento: "vencido" })} />
                    <BucketSmall icon={<FiClock />} label="Vence hoy" items={avisos.vence_hoy.items} emptyText="Nada vence hoy" onSee={() => goLeadsWith({ vencimiento: "hoy" })} />
                    <BucketSmall icon={<FiCalendar />} label="Próximos" items={avisos.proximos.items} emptyText="Sin próximos" onSee={() => goLeadsWith({ vencimiento: "proximo", proximo_en_dias: avisos.params.proximo_en_dias })} />
                    <BucketSmall icon={<FiCalendar />} label="Pendientes" items={avisos.pendientes.items} emptyText="Todos con fecha" onSee={() => goLeadsWith({ vencimiento: "pendiente" })} />
                    <BucketSmall icon={<FiClock />} label="Sin seguimiento" items={avisos.sin_seguimiento.items} emptyText="Todos con seguimiento reciente" showSinSeg onSee={() => goLeadsWith({ sin: avisos.params.recordame_cada })} />
                  </div>
                )}
                {!loadingAvisos && !errorAvisos && !avisos && (
                  <div className="px-3 py-2 text-sm rc-muted">No hay datos de avisos.</div>
                )}
              </div>

              <div className="px-2 py-2 border-t rc-border bg-surface-2/50">
                <button className="w-full h-8 rounded-md border rc-border text-xs hover:bg-black/5 dark:hover:bg-white/5" onClick={fetchAvisos}>
                  Actualizar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Toggle claro/oscuro */}
        <ThemeToggle />
      </div>
    </header>
  );
}

/* ===================== Subcomponente BucketSmall ===================== */
function BucketSmall({
  icon,
  label,
  items,
  emptyText,
  showSinSeg = false,
  onSee,
}: {
  icon: React.ReactNode;
  label: string;
  items: AvisoItem[];
  emptyText: string;
  showSinSeg?: boolean;
  onSee?: () => void;
}) {
  return (
    <div className="p-2">
      <div className="flex items-center gap-2 text-sm font-medium mb-1 rc-text">
        <span className="rc-muted">{icon}</span>
        <span>{label}</span>
        <span className="ml-auto text-xs rc-muted">{items.length}</span>
        {onSee && (
          <button className="ml-2 text-[11px] underline rc-text" onClick={onSee} title="Ver en Leads">
            Ver
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-xs rc-muted">{emptyText}</div>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 5).map((it) => (
            <li key={`${label}-${it.id}`} className="text-xs rc-text">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{`${it.nombre || "—"} ${it.apellido || ""}`}</span>
                <span className="text-[11px] rc-muted">
                  {it.next_contact_at
                    ? new Date(it.next_contact_at).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    : "—"}
                </span>
              </div>
              {showSinSeg && typeof it.dias_sin_seguimiento === "number" && (
                <div className="text-[11px] rc-muted">Sin seg.: {it.dias_sin_seguimiento} d</div>
              )}
              {it.next_contact_note && (
                <div className="text-[11px] rc-muted truncate">{it.next_contact_note}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
