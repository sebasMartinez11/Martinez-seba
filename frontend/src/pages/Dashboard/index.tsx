// src/pages/Dashboard/index.tsx
import { useEffect, useMemo, useState, useRef } from "react";
import type { ReactNode } from "react";
import {
  api,
  fetchEventos,
  fetchLeads,                 // 👈 NEW: para autocompletar
  type Evento as EventoApi,
  type Propiedad as PropiedadApi,
  type Contacto as ContactoApi,
} from "../../lib/api";
import TopFilters from "./TopFilter";

/* ============================== Types ============================== */
// Reutilizo los tipos del cliente API para alinear con el back
type Contacto = ContactoApi;
type Propiedad = PropiedadApi;
type Evento = EventoApi;

type Filters = { date?: string; from?: string; to?: string; types?: string };

/* ============================ Utilities ============================ */
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const toKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const fromISO = (s: string) => new Date(s);
const sortByDateAsc = (a: Evento, b: Evento) =>
  +fromISO(a.fecha_hora) - +fromISO(b.fecha_hora);

const formatHour = (d: string | Date) =>
  (typeof d === "string" ? new Date(d) : d).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (d: Date, opts: Intl.DateTimeFormatOptions = {}) =>
  d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", ...opts });

const toLocalInputValue = (d?: string | Date | null) => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

const plural = (n: number, uno: string, muchos: string) =>
  n === 1 ? uno : muchos;

// Helpers de rango mensual para el fetch del backend
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function monthRange(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1); // exclusivo
  return { from: ymd(start), to: ymd(end) };
}

/* =============== Nuevos helpers para validación de solapamientos =============== */
/**
 * parseFechaHoraRange:
 * - Entrada: evento con campo fecha_hora (ISO string expected)
 * - Retorna { start: Date, end: Date } o null
 * - Por defecto asigna duración = 1 hora (3600000 ms)
 */
const DEFAULT_DURATION_MS = 60 * 60 * 1000;
function parseFechaHoraRange(ev: Partial<Evento>, durationMs = DEFAULT_DURATION_MS): { start: Date; end: Date } | null {
  if (!ev || !ev.fecha_hora) return null;
  const d = new Date(ev.fecha_hora);
  if (isNaN(d.getTime())) return null;
  return { start: d, end: new Date(d.getTime() + durationMs) };
}

/**
 * rangesOverlap: detecta si [aStart, aEnd) se intersecta con [bStart, bEnd)
 */
function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * validateEventoNoSolapa:
 * - Revisa en el arreglo existing si el evento newEv solapa con alguno de ellos.
 * - Comparación por defecto **solo** contra eventos que pertenezcan a la misma propiedad (propiedad).
 * - Duplica exacto: mismo start.getTime() y misma propiedad -> rechazo.
 * - Si mode === "edit" se puede pasar ignoreId para ignorar el mismo evento.
 */
function validateEventoNoSolapa(
  newEv: Partial<Evento>,
  existing: Evento[],
  opts?: { ignoreId?: number; durationMs?: number }
): { ok: true } | { ok: false; msg: string } {
  const dur = opts?.durationMs ?? DEFAULT_DURATION_MS;
  const newRange = parseFechaHoraRange(newEv, dur);
  if (!newRange) return { ok: false, msg: "Fecha/hora inválida." };

  // Si nueva propiedad no está definida, tratamos como global: no permitimos crear si hay duplicado exacto global,
  // pero para solapamiento intentamos comparar solo si property matches. Esto evita false positives.
  const newProp = (newEv as any).propiedad ?? (newEv as any).propiedad_id ?? null;

  for (const ev of existing) {
    if (opts?.ignoreId && ev.id === opts.ignoreId) continue;
    const evRange = parseFechaHoraRange(ev as Partial<Evento>, dur);
    if (!evRange) continue;

    const evProp = (ev as any).propiedad ?? (ev as any).propiedad_id ?? null;

    // duplicado exacto: misma propiedad (o ambos nulos) y misma fecha_hora exacta
    if (newProp === evProp) {
      if (newRange.start.getTime() === evRange.start.getTime()) {
        return {
          ok: false,
          msg: "Ya existe un evento exactamente en esa fecha y hora para la misma propiedad.",
        };
      }
      // chequeo de solapamiento horario solo dentro de la misma propiedad
      if (rangesOverlap(newRange.start, newRange.end, evRange.start, evRange.end)) {
        return {
          ok: false,
          msg: `El horario solapa con otro evento en la misma propiedad (desde ${evRange.start.toLocaleString()} hasta ${evRange.end.toLocaleString()}).`,
        };
      }
    }
  }

  return { ok: true };
}

/* ============================== Page =============================== */
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [today] = useState(new Date());
  const [cursor, setCursor] = useState(new Date()); // mes mostrado

  // filtros activos (si hay algo acá, se prioriza sobre la vista mensual)
  const [activeFilters, setActiveFilters] = useState<Filters | null>(null);

  // UI/Modals
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [openEventModal, setOpenEventModal] = useState<{
    mode: "create" | "edit";
    baseDate?: Date;
    evento?: Evento;
  } | null>(null);
  const [openDayModal, setOpenDayModal] = useState<Date | null>(null);
  const [deleting, setDeleting] = useState<Evento | null>(null);

  /* ------------------------ Fetch data ------------------------ */
  // Datos “estáticos” (contactos/propiedades) — una sola vez (lista base para selects)
  async function fetchStatic() {
    try {
      const [cRes, pRes] = await Promise.all([api.get("contactos/"), api.get("propiedades/")]);
      const toArr = (d: any) => Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : [];
      setContactos(toArr(cRes.data));
      setPropiedades(toArr(pRes.data));
    } catch (e) {
      console.error(e);
      setContactos([]); setPropiedades([]);
      setResult({ ok: false, msg: "No se pudieron cargar contactos/propiedades." });
    }
  }

  // Eventos según el MES visible (cursor)
  async function fetchMonthEvents(d = cursor) {
    const { from, to } = monthRange(d);
    const data = await fetchEventos({ from, to, ordering: "fecha_hora" });
    setEventos(Array.isArray(data) ? data : data?.results ?? []);
  }

  // Eventos con filtros activos (hoy/mañana/semana/tipo)
  async function fetchWithFilters(filters: Filters) {
    const data = await fetchEventos({ ...filters, ordering: "fecha_hora" });
    setEventos(Array.isArray(data) ? data : data?.results ?? []);
  }

  useEffect(() => {
    setLoading(true);
    fetchStatic().finally(() => setLoading(false));
  }, []);

  // si hay filtros → traer con filtros; si no → traer por mes cuando cambie cursor
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (activeFilters) await fetchWithFilters(activeFilters);
        else await fetchMonthEvents();
      } catch (e) {
        console.error(e);
        setEventos([]);
        setResult({ ok: false, msg: activeFilters ? "No se pudieron cargar los eventos filtrados." : "No se pudieron cargar los eventos del mes." });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, activeFilters]);

  /* 🔔 Auto-refresh cuando el asistente crea algo */
  useEffect(() => {
    const handler = () => {
      if (activeFilters) fetchWithFilters(activeFilters);
      else fetchMonthEvents();
    };
    window.addEventListener("assistant:refresh-calendar", handler as EventListener);
    return () => window.removeEventListener("assistant:refresh-calendar", handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters, cursor]);

  /* ------------------------ Calendar helpers ------------------------ */
  const monthLabel = `${MONTHS[cursor.getMonth()]} de ${cursor.getFullYear()}`;

  // Lunes como primer día (grilla 7x6)
  const monthGrid = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startDay = (start.getDay() + 6) % 7; // 0..6 con 0 = Lunes
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - startDay);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return { days };
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Evento[]>();
    for (const ev of eventos) {
      const d = new Date(ev.fecha_hora);
      const key = toKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    for (const list of map.values()) list.sort(sortByDateAsc);
    return map;
  }, [eventos]);

  // Resumen por día
  const summaryByDay = useMemo(() => {
    const m = new Map<string, { r: number; l: number; v: number; total: number }>();
    for (const [k, list] of eventsByDay.entries()) {
      let r = 0, l = 0, v = 0;
      for (const ev of list) {
        if (ev.tipo === "Reunion") r++;
        else if (ev.tipo === "Llamada") l++;
        else if (ev.tipo === "Visita") v++;
      }
      m.set(k, { r, l, v, total: list.length });
    }
    return m;
  }, [eventsByDay]);

  /* ------------------------------ KPIs ------------------------------ */
  const kpis = useMemo(() => {
    const totalLeads = contactos.length;
    const norm = (s?: string | null) => (s || "").trim().toLowerCase();
    const isVendida = (p: Propiedad) => norm(p.estado).includes("vendid");

    let enVenta = 0, enAlquiler = 0, vendidas = 0;
    for (const p of propiedades) {
      if (isVendida(p)) { vendidas++; continue; }
      const d = norm(p.disponibilidad);
      if (d === "venta") enVenta++;
      else if (d === "alquiler") enAlquiler++;
    }

    const evInMonth = eventos.length; // ya traemos solo el mes o filtros
    return [
      { label: "Leads", value: totalLeads, hint: "Totales" },
      { label: "Propiedades en venta", value: enVenta, hint: "" },
      { label: "Propiedades en alquiler", value: enAlquiler, hint: "" },
      { label: "Propiedades vendidas", value: vendidas, hint: "" },
      { label: "Reuniones programadas", value: evInMonth, hint: "" },
    ];
  }, [contactos, propiedades, eventos]);

  /* ---------------------------- Handlers ---------------------------- */
  const prevMonth = () => { const d = new Date(cursor); d.setMonth(cursor.getMonth() - 1); setCursor(d); };
  const nextMonth = () => { const d = new Date(cursor); d.setMonth(cursor.getMonth() + 1); setCursor(d); };

  function openCreateOnDay(d: Date) { setOpenEventModal({ mode: "create", baseDate: d }); }

  /**
   * saveEvento: valida solapamientos/duplicados (front) antes de post/patch
   */
  async function saveEvento(data: Partial<Evento>, mode: "create" | "edit", id?: number) {
    const payload: any = {};
    (["nombre","apellido","email","tipo","fecha_hora","notas","propiedad","contacto"] as const)
      .forEach((k) => { const v = (data as any)[k]; if (v !== undefined) payload[k] = v; });

    // --- Validación front: no solapamiento / duplicado en la misma propiedad ---
    // Cuando se edita, ignoramos el id del evento en la validación
    const ignoreId = mode === "edit" ? id : undefined;
    const valid = validateEventoNoSolapa(payload, eventos, { ignoreId });
    if (!valid.ok) {
      setResult({ ok: false, msg: (valid as any).msg });
      return;
    }

    try {
      if (mode === "create") await api.post("eventos/", payload);
      else if (id) await api.patch(`eventos/${id}/`, payload);
      // refrescar según contexto
      if (activeFilters) await fetchWithFilters(activeFilters);
      else await fetchMonthEvents();
      setOpenEventModal(null);
      setOpenDayModal(null);
      setResult({ ok: true, msg: "Evento guardado correctamente." });
    } catch (e) {
      console.error(e);
      setResult({ ok: false, msg: "No se pudo guardar el evento." });
    }
  }

  async function deleteEvento(ev: Evento) {
    try {
      await api.delete(`eventos/${ev.id}/`);
      if (activeFilters) await fetchWithFilters(activeFilters);
      else await fetchMonthEvents();
      setDeleting(null);
      setResult({ ok: true, msg: "Evento eliminado." });
    } catch (e) {
      console.error(e);
      setResult({ ok: false, msg: "No se pudo eliminar el evento." });
    }
  }

  function applyFilters(f: Filters) {
    setActiveFilters((prev) => {
      // si cambian filtros, no dependemos del mes; igualmente movemos el cursor al día de 'date' si viene
      if (f.date) {
        const [y, m, d] = f.date.split("-").map(Number);
        setCursor(new Date(y, (m ?? 1) - 1, d ?? 1));
      } else if (f.from) {
        const [y, m] = f.from.split("-").map(Number);
        setCursor(new Date(y, (m ?? 1) - 1, 1));
      }
      return { ...f };
    });
  }

  function clearFilters() {
    setActiveFilters(null);
  }

  /* ------------------------------- UI ------------------------------- */
  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Bienvenido a Real Connect</h2>

          <div className="flex items-center gap-2">
            <button
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 h-9"
              onClick={() => setOpenEventModal({ mode: "create", baseDate: new Date() })}
            >
              + Agregar evento
            </button>
            <div className="flex items-center gap-2">
              <button className="h-9 w-9 rounded-lg border text-lg" onClick={prevMonth}>←</button>
              <div className="min-w-[200px] text-center font-medium">{monthLabel}</div>
              <button className="h-9 w-9 rounded-lg border text-lg" onClick={nextMonth}>→</button>
            </div>
          </div>
        </div>

        {/* Filtros rápidos */}
        <div className="flex items-center gap-3">
          <TopFilters onChange={applyFilters} />
          {activeFilters && (
            <button className="h-9 px-3 rounded-lg border text-sm" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-4">
              <div className="text-3xl font-semibold">{k.value}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{k.label}</div>
              {k.hint && <div className="text-xs text-gray-400 mt-1">{k.hint}</div>}
            </div>
          ))}
        </section>

        {/* Calendar */}
        <div className="rounded-2xl border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* header week days */}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-900 text-xs text-gray-500">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-3 py-2">{w}</div>
            ))}
          </div>

          {/* month grid con alto mínimo y expansión automática */}
          <div className="grid grid-cols-7 auto-rows-[minmax(7rem,auto)]">
            {monthGrid.days.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const key = toKey(d);
              const isToday = sameDay(d, today);
              const allEvents = inMonth ? (eventsByDay.get(key) || []) : [];
              const sum = summaryByDay.get(key) || { r: 0, l: 0, v: 0, total: 0 };

              const dd = String(d.getDate()).padStart(2, "0");
              const monthAbbr = MONTHS[d.getMonth()].slice(0, 3);
              const dayLabel = inMonth ? (d.getDate() === 1 ? `${dd}-${monthAbbr}` : dd) : "";

              return (
                <div
                  key={i}
                  className={`border-r border-b border-gray-100 dark:border-gray-900 p-2 ${inMonth ? "" : "bg-gray-50/50 dark:bg-gray-900/30"}`}
                  title={inMonth ? formatDate(d, { year: "numeric" }) : undefined}
                >
                  {/* Contenedor columna + evitar desborde */}
                  <div className="flex h-full min-h-[7rem] flex-col overflow-hidden">
                    {/* header mini */}
                    <div className="flex items-center justify-between shrink-0">
                      <div className={`text-xs ${inMonth ? "text-gray-600 dark:text-gray-300" : "text-gray-400"}`}>
                        {dayLabel}
                      </div>
                      {inMonth && isToday && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white">Hoy</span>
                      )}
                    </div>

                    {/* Resumen compacto en una sola línea */}
                    {inMonth && sum.total > 0 && (
                      <button
                        className="mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 px-2 py-1 text-[11px] text-left hover:bg-gray-100/60 dark:hover:bg-gray-900/60 truncate"
                        onClick={() => setOpenDayModal(d)}
                        title={`${sum.r} ${plural(sum.r, "reunión", "reuniones")} · ${sum.l} ${plural(sum.l, "llamada", "llamadas")} · ${sum.v} ${plural(sum.v, "visita", "visitas")}`}
                      >
                        {sum.r} {plural(sum.r, "reunión", "reuniones")} · {sum.l} {plural(sum.l, "llamada", "llamadas")} · {sum.v} {plural(sum.v, "visita", "visitas")}
                      </button>
                    )}

                    {/* Espaciador */}
                    <div className="flex-1 min-h-0" />

                    {/* Acciones rápidas ancladas abajo */}
                    {inMonth && (
                      <div className="pt-2 shrink-0">
                        <button
                          className="text-[11px] border px-1.5 py-0.5 rounded hover:bg-gray-50 dark:hover:bg-gray-900"
                          onClick={() => openCreateOnDay(d)}
                        >
                          + nuevo
                        </button>
                        {allEvents.length > 0 && (
                          <button
                            className="ml-2 text-[11px] border px-1.5 py-0.5 rounded hover:bg-gray-50 dark:hover:bg-gray-900"
                            onClick={() => setOpenDayModal(d)}
                          >
                            ver
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Events Modal */}
        {openDayModal && (
          <DayEventsModal
            date={openDayModal}
            eventos={(eventsByDay.get(toKey(openDayModal)) || []).slice().sort(sortByDateAsc)}
            resumen={summaryByDay.get(toKey(openDayModal)) || { r: 0, l: 0, v: 0, total: 0 }}
            onClose={() => setOpenDayModal(null)}
            onEdit={(ev) => setOpenEventModal({ mode: "edit", evento: ev })}
            onDelete={(ev) => setDeleting(ev)}
            onCreate={() => setOpenEventModal({ mode: "create", baseDate: openDayModal })}
          />
        )}

        {/* Create/Edit Event Modal */}
        {openEventModal && (
          <EventModal
            mode={openEventModal.mode}
            baseDate={openEventModal.baseDate}
            evento={openEventModal.evento}
            contactos={contactos}
            propiedades={propiedades}
            onCancel={() => setOpenEventModal(null)}
            onSave={saveEvento}
          />
        )}

        {/* Delete confirm */}
        {deleting && (
          <ConfirmModal
            title="Eliminar evento"
            message={`¿Seguro que querés eliminar el evento de ${formatHour(deleting.fecha_hora)} (${deleting.tipo})?`}
            confirmLabel="Eliminar"
            confirmType="danger"
            onCancel={() => setDeleting(null)}
            onConfirm={() => deleteEvento(deleting)}
          />
        )}

        {/* Result toast modal */}
        {result && <ResultModal ok={result.ok} message={result.msg} onClose={() => setResult(null)} />}

        {loading && <div className="text-sm text-gray-500">Cargando…</div>}
      </div>
    </>
  );
}

/* ============================= Day Modal ============================= */
function DayEventsModal({
  date,
  eventos,
  resumen,
  onClose,
  onEdit,
  onDelete,
  onCreate,
}: {
  date: Date;
  eventos: Evento[];
  resumen: { r: number; l: number; v: number; total: number };
  onClose: () => void;
  onEdit: (ev: Evento) => void;
  onDelete: (ev: Evento) => void;
  onCreate: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Eventos del {formatDate(date, { year: "numeric" })}</div>
          <div className="flex gap-2">
            <button className="h-9 px-3 rounded-lg border text-sm" onClick={onCreate}>+ Nuevo</button>
            <button className="h-9 px-3 rounded-lg border text-sm" onClick={onClose}>Cerrar</button>
          </div>
        </div>

        {/* Resumen del día */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30">
            {resumen.r} {plural(resumen.r, "reunión", "reuniones")}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
            {resumen.l} {plural(resumen.l, "llamada", "llamadas")}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            {resumen.v} {plural(resumen.v, "visita", "visitas")}
          </span>
          <span className="ml-auto text-xs opacity-70">Total: {resumen.total}</span>
        </div>

        {eventos.length === 0 ? (
          <div className="mt-5 text-sm text-gray-500">No hay eventos para este día.</div>
        ) : (
          <ul className="mt-4 space-y-2">
            {eventos.map((ev) => (
              <li key={ev.id} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {formatHour(ev.fecha_hora)} · {ev.tipo}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                    {typeof (ev as any).propiedad_titulo === "string"
                      ? (ev as any).propiedad_titulo
                      : ev.propiedad
                      ? `Propiedad #${ev.propiedad}`
                      : "—"}
                    {(ev as any).contacto_nombre
                      ? ` • ${(ev as any).contacto_nombre}`
                      : ev.contacto
                      ? ` • Lead #${ev.contacto}`
                      : ""}
                  </div>
                  {ev.notas && <div className="text-xs text-gray-500 mt-0.5 truncate">{ev.notas}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <button className="h-8 px-2 rounded-md border text-xs" onClick={() => onEdit(ev)}>Editar</button>
                  <button className="h-8 px-2 rounded-md border border-rose-600/40 text-rose-500 text-xs" onClick={() => onDelete(ev)}>Borrar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ============================ Event Modal ============================ */
function EventModal({
  mode,
  baseDate,
  evento,
  contactos,
  propiedades,
  onCancel,
  onSave,
}: {
  mode: "create" | "edit";
  baseDate?: Date;
  evento?: Evento;
  contactos: Contacto[];
  propiedades: Propiedad[];
  onCancel: () => void;
  onSave: (data: Partial<Evento>, mode: "create" | "edit", id?: number) => void | Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Evento>>(
    evento
      ? { ...evento }
      : {
          tipo: "Reunion",
          fecha_hora: toLocalInputValue(baseDate || new Date()),
          propiedad: propiedades[0]?.id,
          contacto: undefined,
        }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Evento>(k: K, v: Evento[K] | any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit() {
    setError(null);
    if (!form.propiedad) { setError("Seleccioná una propiedad."); return; }
    if (!form.fecha_hora) { setError("Cargá fecha y hora."); return; }
    setSaving(true);
    try {
      let fechaISO = String(form.fecha_hora);
      if (fechaISO.length <= 16 && fechaISO.includes("T")) {
        const d = new Date(fechaISO);
        fechaISO = d.toISOString();
      }
      await onSave(
        {
          ...form,
          fecha_hora: fechaISO,
          contacto: (form as any).contacto === "" ? null : form.contacto,
          email: form.email || undefined,
          nombre: form.nombre || undefined,
          apellido: form.apellido || undefined,
          notas: form.notas || undefined,
        },
        mode,
        evento?.id
      );
    } catch {
      setError("Ocurrió un error. Intentá otra vez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4" onClick={onCancel}>
      <div
        className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xl font-semibold mb-4">
          {mode === "create" ? "Nuevo evento" : "Editar evento"}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tipo">
            <select
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
              value={form.tipo || "Reunion"}
              onChange={(e) => set("tipo", e.target.value as Evento["tipo"])}
            >
              <option value="Reunion">Reunión</option>
              <option value="Visita">Visita</option>
              <option value="Llamada">Llamada</option>
            </select>
          </Field>

          <Field label="Fecha y hora">
            <input
              type="datetime-local"
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
              value={
                form.fecha_hora && form.fecha_hora.includes("T") && form.fecha_hora.length > 16
                  ? toLocalInputValue(new Date(form.fecha_hora))
                  : String(form.fecha_hora || "")
              }
              onChange={(e) => set("fecha_hora", e.target.value)}
            />
          </Field>

          <Field label="Propiedad">
            <select
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
              value={String(form.propiedad || "")}
              onChange={(e) => set("propiedad", Number(e.target.value))}
            >
              {propiedades.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.titulo || (p as any).direccion || `Propiedad #${p.id}`}
                </option>
              ))}
            </select>
          </Field>

          {/* 👇 Autocompletado de Contacto (Lead) */}
          <Field label="Contacto (opcional)">
            <ContactAutocomplete
              valueId={form.contacto == null ? null : Number(form.contacto)}
              initialList={contactos}
              onChange={(id, item) => {
                set("contacto", id);
                // Limpio visitante si hay lead
                if (id) {
                  set("nombre", "");
                  set("apellido", "");
                  set("email", null);
                }
              }}
              onClear={() => set("contacto", null)}
            />
          </Field>

          <Field label="Nombre (visitante)">
            <input
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
              value={form.nombre || ""}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Si no es contacto registrado"
            />
          </Field>

          <Field label="Apellido (visitante)">
            <input
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
              value={form.apellido || ""}
              onChange={(e) => set("apellido", e.target.value)}
            />
          </Field>

          <Field label="Email (visitante)">
            <input
              type="email"
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
              value={form.email || ""}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Notas">
              <textarea
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                value={form.notas || ""}
                onChange={(e) => set("notas", e.target.value)}
              />
            </Field>
          </div>
        </div>

        {error && <div className="mt-3 text-sm text-rose-500">{error}</div>}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button className="h-10 px-4 rounded-lg border text-sm" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button
            className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================= Autocomplete Contacto ======================= */
function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function ContactAutocomplete({
  valueId,
  initialList,
  onChange,
  onClear,
}: {
  valueId: number | null;
  initialList: Contacto[];
  onChange: (id: number | null, item?: Contacto | null) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 300);
  const [items, setItems] = useState<Contacto[]>(initialList || []);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => (valueId ? items.find((i) => i.id === valueId) : null),
    [valueId, items]
  );

  // Buscar cuando cambia el query debounced
  useEffect(() => {
    let done = false;
    (async () => {
      try {
        const q = debounced.trim();
        // si no hay query, mostramos los primeros 10 de initialList
        if (!q) {
          setItems(initialList.slice(0, 10));
          return;
        }
        const res = await fetchLeads({ q, limit: 10 });
        if (!done) setItems(Array.isArray(res) ? res : res?.results ?? []);
      } catch (e) {
        // no romper el input
      }
    })();
    return () => { done = true; };
  }, [debounced, initialList]);

  // Cerrar al click fuera
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(it: Contacto | null) {
    onChange(it ? it.id : null, it || null);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = items[highlight];
      if (it) pick(it);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      {/* Input + estado seleccionado */}
      <div className="flex gap-2">
        <input
          className="flex-1 h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
          placeholder="Escribí nombre/apellido/email del lead…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
          onKeyDown={onKey}
          onFocus={() => setOpen(true)}
        />
        {valueId != null ? (
          <button
            type="button"
            className="h-10 px-3 rounded-lg border text-sm"
            onClick={() => { onClear(); }}
            title="Quitar contacto"
          >
            Limpiar
          </button>
        ) : null}
      </div>

      {/* hint seleccionado */}
      {valueId != null && selected && (
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
          Seleccionado: <strong>{(selected.nombre || "") + " " + (selected.apellido || "")}</strong>
          {selected.email ? ` • ${selected.email}` : ""}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-xl">
          {items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Sin resultados…</div>
          ) : (
            items.map((it, idx) => {
              const full = `${it.nombre || ""} ${it.apellido || ""}`.trim() || `Lead #${it.id}`;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => pick(it)}
                  className={`w-full text-left px-3 py-2 text-sm ${
                    idx === highlight ? "bg-blue-600 text-white" : "hover:bg-gray-50 dark:hover:bg-gray-900"
                  }`}
                  onMouseEnter={() => setHighlight(idx)}
                >
                  <div className="font-medium truncate">{full}</div>
                  <div className={`text-xs truncate ${idx === highlight ? "opacity-90" : "text-gray-500 dark:text-gray-400"}`}>
                    {it.email || it.telefono || "—"}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ============================ Confirm Modal ============================ */
type ConfirmModalProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmType?: "primary" | "danger";
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmar",
  confirmType = "primary",
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const [working, setWorking] = useState(false);
  async function go() {
    setWorking(true);
    await onConfirm();
    setWorking(false);
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-6 shadow-xl">
        <div className="text-lg font-semibold mb-2">{title}</div>
        <div className="text-sm text-gray-600 dark:text-gray-300">{message}</div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button className="h-9 px-3 rounded-lg border text-sm" onClick={onCancel} disabled={working}>
            Cancelar
          </button>
          <button
            className={
              confirmType === "danger"
                ? "h-9 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm disabled:opacity-60"
                : "h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60"
            }
            onClick={go}
            disabled={working}
          >
            {working ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================= Result Modal ============================ */
function ResultModal({ ok, message, onClose }: { ok: boolean; message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-2xl border p-5 shadow-lg ${
          ok ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
             : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-semibold mb-2">{ok ? "OK" : "Ups"}</div>
        <div className="text-sm">{message}</div>
        <div className="mt-4 text-right">
          <button className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================ UI bits ================================ */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1">{label}</label>
      {children}
    </div>
  );
}
