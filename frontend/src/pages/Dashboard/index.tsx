import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";

// ------------------ Tipos ------------------
type Evento = {
  id: number;
  tipo: "Reunion" | "Visita" | "Llamada";
  fecha_hora: string; // ISO
  propiedad: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  notas?: string;
};

type Propiedad = {
  id: number;
  titulo: string;
  estado: "disponible" | "vendido" | "reservado";
  precio: number;
  moneda: "USD" | "ARS";
};

type Lead = {
  id: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
};

type KPI = {
  label: string;
  value: number | string;
  hint?: string;
};

// ------------------ Utils ------------------
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function fmtShort(date: Date) {
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}
function fmtHour(date: Date) {
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

const COLOR_BY_TIPO: Record<Evento["tipo"], string> = {
  Reunion: "bg-blue-600",
  Visita: "bg-green-600",
  Llamada: "bg-amber-600",
};

// ------------------ Preview modal ------------------
type PreviewProps = {
  evento: Evento & { propiedad_titulo?: string };
  onClose: () => void;
};
function EventPreview({ evento, onClose }: PreviewProps) {
  const d = new Date(evento.fecha_hora);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="text-lg font-semibold">Detalle del evento</h4>
          <button
            className="text-sm px-2 h-8 rounded-md border border-gray-300 dark:border-gray-700"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                COLOR_BY_TIPO[evento.tipo] ?? "bg-gray-600"
              }`}
            />
            <span className="font-medium">{evento.tipo}</span>
          </div>

          <div className="text-gray-700 dark:text-gray-300">
            <span className="font-medium">Fecha y hora: </span>
            {d.toLocaleDateString("es-AR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}{" "}
            · {fmtHour(d)}
          </div>

          {evento.propiedad_titulo && (
            <div className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Propiedad: </span>
              {evento.propiedad_titulo}
            </div>
          )}

          {(evento.nombre || evento.apellido || evento.email) && (
            <div className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Contacto: </span>
              {[evento.nombre, evento.apellido].filter(Boolean).join(" ") ||
                "—"}
              {evento.email ? ` · ${evento.email}` : ""}
            </div>
          )}

          {evento.notas && (
            <div className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Notas: </span>
              {evento.notas}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------ Página ------------------
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [props, setProps] = useState<Propiedad[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()));

  // preview seleccionado
  const [preview, setPreview] = useState<(Evento & { propiedad_titulo?: string }) | null>(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [evRes, prRes, ldRes] = await Promise.all([
        axios.get("/api/eventos/"),
        axios.get("/api/propiedades/"),
        axios.get("/api/contactos/"),
      ]);

      const toArr = (data: any) =>
        Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

      setEventos(toArr(evRes.data));
      setProps(toArr(prRes.data));
      setLeads(toArr(ldRes.data));
    } catch (e) {
      console.error("Dashboard fetch error", e);
      setEventos([]);
      setProps([]);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  // --- KPIs
  const kpis: KPI[] = useMemo(() => {
    const vendidos = props.filter((p) => p.estado === "vendido").length;
    const disponibles = props.filter((p) => p.estado === "disponible").length;
    const proximos = eventos.filter((e) => new Date(e.fecha_hora) >= new Date()).length;

    return [
      { label: "Leads", value: leads.length, hint: "Totales" },
      { label: "Propiedades en venta", value: disponibles },
      { label: "Propiedades vendidas", value: vendidos },
      { label: "Reuniones programadas", value: proximos },
    ];
  }, [leads, props, eventos]);

  // --- Calendario (mes actual)
  const daysInGrid = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);

    // Arranca el grid en lunes
    const startIdx = (first.getDay() + 6) % 7; // 0..6, 0 = lunes
    const totalDays = last.getDate();

    const days: Date[] = [];
    // prev month fillers
    for (let i = 0; i < startIdx; i++) {
      const d = new Date(first);
      d.setDate(first.getDate() - (startIdx - i));
      days.push(d);
    }
    // current month
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(cursor.getFullYear(), cursor.getMonth(), i));
    }
    // next fillers
    while (days.length % 7 !== 0) {
      const lastDay = days[days.length - 1];
      const d = new Date(lastDay);
      d.setDate(lastDay.getDate() + 1);
      days.push(d);
    }
    return days;
  }, [cursor]);

  const weeks = Math.ceil(daysInGrid.length / 7);

  const eventosPorDia = useMemo(() => {
    const map = new Map<string, Evento[]>();
    for (const ev of eventos) {
      const d = new Date(ev.fecha_hora);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [eventos]);

  function eventsFor(date: Date) {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventosPorDia.get(key) || [];
  }

  const monthLabel = cursor.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  // Próximos eventos (para mobile)
  const proximosEventos = useMemo(() => {
    const now = new Date();
    return [...eventos]
      .filter((e) => new Date(e.fecha_hora) >= now)
      .sort((a, b) => +new Date(a.fecha_hora) - +new Date(b.fecha_hora))
      .slice(0, 20);
  }, [eventos]);

  const getPropTitle = useCallback(
    (id?: number) => props.find((p) => p.id === id)?.titulo,
    [props]
  );

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-120px)]">
      {/* Header + KPIs */}
      <div className="shrink-0 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Dashboard</h2>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setCursor(addMonths(cursor, -1))}
              className="rounded-md border px-3 h-9 text-sm border-gray-300 dark:border-gray-700"
              aria-label="Mes anterior"
            >
              ←
            </button>
            <div className="min-w-[160px] text-center font-medium">{monthLabel}</div>
            <button
              onClick={() => setCursor(addMonths(cursor, +1))}
              className="rounded-md border px-3 h-9 text-sm border-gray-300 dark:border-gray-700"
              aria-label="Mes siguiente"
            >
              →
            </button>
          </div>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-xl border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-4"
            >
              <div className="text-sm text-gray-500 dark:text-gray-400">{k.label}</div>
              <div className="text-3xl font-semibold mt-1">{k.value}</div>
              {k.hint && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{k.hint}</div>
              )}
            </div>
          ))}
        </section>
      </div>

      {/* Calendario (desktop/tablet) */}
      <section className="hidden md:flex flex-col flex-1 rounded-2xl border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Week header */}
        <div className="grid grid-cols-7 text-xs font-medium bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-800">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <div key={d} className="px-3 py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Grid (sin scroll de página) */}
        <div
          className="grid grid-cols-7 flex-1"
          style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
        >
          {daysInGrid.map((d, idx) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const today = isSameDay(d, new Date());
            const evs = eventsFor(d);
            return (
              <div
                key={idx}
                className={[
                  "border border-gray-100 dark:border-gray-900 p-2 overflow-hidden",
                  !inMonth ? "bg-gray-50 dark:bg-gray-900/30 opacity-70" : "",
                  today ? "ring-1 ring-blue-500" : "",
                  "flex flex-col",
                ].join(" ")}
              >
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  {fmtShort(d)}
                </div>

                <div className="mt-1 flex flex-col gap-1 overflow-auto">
                  {evs.map((e) => {
                    const color = COLOR_BY_TIPO[e.tipo] ?? "bg-gray-600";
                    const hh = fmtHour(new Date(e.fecha_hora));
                    const propTitle = getPropTitle(e.propiedad);
                    return (
                      <button
                        key={e.id}
                        title={`${e.tipo} — ${hh}`}
                        className={`text-[11px] text-white ${color} rounded px-1 py-0.5 truncate text-left`}
                        onClick={() =>
                          setPreview({
                            ...e,
                            propiedad_titulo: propTitle,
                          })
                        }
                      >
                        {hh} · {e.tipo}
                        {propTitle ? ` · ${propTitle}` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Agenda (mobile) */}
      <section className="md:hidden flex-1 overflow-auto rounded-xl border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="text-sm font-medium">Próximos eventos</div>
          <div className="text-xs text-gray-500">{monthLabel}</div>
        </div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-800">
          {proximosEventos.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-500">Sin eventos próximos.</li>
          )}
          {proximosEventos.map((e) => {
            const color = COLOR_BY_TIPO[e.tipo] ?? "bg-gray-600";
            const d = new Date(e.fecha_hora);
            const propTitle = getPropTitle(e.propiedad);
            return (
              <li
                key={e.id}
                className="px-4 py-3 flex items-center gap-3"
                onClick={() => setPreview({ ...e, propiedad_titulo: propTitle })}
              >
                <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {e.tipo}
                    {propTitle ? ` · ${propTitle}` : ""}
                  </div>
                  <div className="text-xs text-gray-500">
                    {d.toLocaleDateString("es-AR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    · {fmtHour(d)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {loading && <div className="text-sm text-gray-500">Actualizando…</div>}

      {/* PREVIEW */}
      {preview && <EventPreview evento={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
