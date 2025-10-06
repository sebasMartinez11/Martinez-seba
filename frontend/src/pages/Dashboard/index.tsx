// src/pages/Dashboard/index.tsx
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";

/* ============================== Types ============================== */
type Contacto = {
  id: number;
  nombre?: string;
  apellido?: string;
  email?: string | null;
};

type Propiedad = {
  id: number;
  titulo?: string;
  direccion?: string;
  estado?: string | null; // ej: "disponible", "vendido", etc.
  vendida?: boolean | null; // compat con back existente
  disponibilidad?: "venta" | "alquiler" | string | null; // <-- NUEVO
};

type Evento = {
  id: number;
  nombre?: string;
  apellido?: string;
  email?: string | null;
  contacto?: number | null;
  propiedad: number;
  tipo: "Reunion" | "Visita" | "Llamada";
  fecha_hora: string;
  notas?: string;
  creado_en?: string;
};

/* ============================ Utilities ============================ */
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const toKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const fromISO = (s: string) => new Date(s);
const sortByDateAsc = (a: Evento, b: Evento) => +fromISO(a.fecha_hora) - +fromISO(b.fecha_hora);

const formatHour = (d: string | Date) =>
  (typeof d === "string" ? new Date(d) : d).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

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

const plural = (n: number, uno: string, muchos: string) => (n === 1 ? uno : muchos);

/* ============================== Page =============================== */
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [today] = useState(new Date());
  const [cursor, setCursor] = useState(new Date()); // mes mostrado

  // UI/Modals
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [openEventModal, setOpenEventModal] = useState<{
    mode: "create" | "edit";
    baseDate?: Date;
    evento?: Evento;
  } | null>(null);
  const [openDayModal, setOpenDayModal] = useState<Date | null>(null);
  const [deleting, setDeleting] = useState<Evento | null>(null);

<<<<<<< HEAD
  //  Ajuste automático de altura del calendario
  const calendarRef = useRef<HTMLDivElement>(null);
  const weekHeaderRef = useRef<HTMLDivElement>(null);
  const [calHeight, setCalHeight] = useState<number | null>(null);
  const [dayHeight, setDayHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const recompute = () => {
      if (!calendarRef.current) return;
      const rect = calendarRef.current.getBoundingClientRect();
      const available = Math.max(320, Math.floor(window.innerHeight - rect.top - 24)); // margen inferior
      const weekH = weekHeaderRef.current?.offsetHeight ?? 32;
      const gridH = Math.max(180, available - weekH);
      const cellH = Math.max(84, Math.floor(gridH / 6)); // 6 semanas visibles
      setCalHeight(available);
      setDayHeight(cellH);
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

=======
>>>>>>> abd818dd92abbb4eea93f14917d024f149e5f281
  async function fetchAll() {
    setLoading(true);
    try {
      const [evRes, cRes, pRes] = await Promise.all([
        axios.get("/api/eventos/"),
        axios.get("/api/contactos/"),
        axios.get("/api/propiedades/"),
      ]);
      const toArr = (d: any) => (Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : []);
      setEventos(toArr(evRes.data));
      setContactos(toArr(cRes.data));
      setPropiedades(toArr(pRes.data));
    } catch (e) {
      console.error(e);
      setEventos([]); setContactos([]); setPropiedades([]);
      setResult({ ok: false, msg: "No se pudo cargar información del dashboard." });
    } finally { setLoading(false); }
  }
  useEffect(() => { fetchAll(); }, []);

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
    const isVendida = (p: Propiedad) => p.vendida === true || norm(p.estado).includes("vendid");

    let enVenta = 0, enAlquiler = 0, vendidas = 0;
    for (const p of propiedades) {
      if (isVendida(p)) { vendidas++; continue; }
      const d = norm(p.disponibilidad);
      if (d === "venta") enVenta++;
      else if (d === "alquiler") enAlquiler++;
    }

    const evInMonth = eventos.filter((e) => {
      const d = new Date(e.fecha_hora);
      return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
    }).length;

    return [
      { label: "Leads", value: totalLeads, hint: "Totales" },
      { label: "Propiedades en venta", value: enVenta, hint: "" },
      { label: "Propiedades en alquiler", value: enAlquiler, hint: "" },
      { label: "Propiedades vendidas", value: vendidas, hint: "" },
      { label: "Reuniones programadas", value: evInMonth, hint: "" },
    ];
  }, [contactos, propiedades, eventos, cursor]);

  /* ---------------------------- Handlers ---------------------------- */
  const prevMonth = () => { const d = new Date(cursor); d.setMonth(cursor.getMonth() - 1); setCursor(d); };
  const nextMonth = () => { const d = new Date(cursor); d.setMonth(cursor.getMonth() + 1); setCursor(d); };

  function openCreateOnDay(d: Date) { setOpenEventModal({ mode: "create", baseDate: d }); }

  async function saveEvento(data: Partial<Evento>, mode: "create" | "edit", id?: number) {
    const payload: any = {};
    (["nombre","apellido","email","tipo","fecha_hora","notas","propiedad","contacto"] as const)
      .forEach((k) => { const v = (data as any)[k]; if (v !== undefined) payload[k] = v; });

    try {
      if (mode === "create") await axios.post("/api/eventos/", payload);
      else if (id) await axios.patch(`/api/eventos/${id}/`, payload);
      await fetchAll();
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
      await axios.delete(`/api/eventos/${ev.id}/`);
      await fetchAll();
      setDeleting(null);
      setResult({ ok: true, msg: "Evento eliminado." });
    } catch (e) {
      console.error(e);
      setResult({ ok: false, msg: "No se pudo eliminar el evento." });
    }
  }

  /* ------------------------------- UI ------------------------------- */
  return (
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

      {/* Calendar (filas fluidas que se estiran si hace falta) */}
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

                  {/* Espaciador para empujar acciones abajo */}
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
          <div className="text-lg font-semibold">
            Eventos del {formatDate(date, { year: "numeric" })}
          </div>
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

  function set<K extends keyof Evento>(k: K, v: Evento[K] | any) { setForm((f) => ({ ...f, [k]: v })); }

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
          contacto: form.contacto === ("" as any) ? null : form.contacto,
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
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4" onClick={onCancel}>
      <div
        className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xl font-semibold mb-4">{mode === "create" ? "Nuevo evento" : "Editar evento"}</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tipo">
            <select className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
                    value={form.tipo || "Reunion"} onChange={(e) => set("tipo", e.target.value as Evento["tipo"])}>
              <option value="Reunion">Reunión</option>
              <option value="Visita">Visita</option>
              <option value="Llamada">Llamada</option>
            </select>
          </Field>

          <Field label="Fecha y hora">
            <input type="datetime-local" className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
                   value={
                     form.fecha_hora && form.fecha_hora.includes("T") && form.fecha_hora.length > 16
                       ? toLocalInputValue(new Date(form.fecha_hora))
                       : String(form.fecha_hora || "")
                   }
                   onChange={(e) => set("fecha_hora", e.target.value)} />
          </Field>

          <Field label="Propiedad">
            <select className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
                    value={String(form.propiedad || "")}
                    onChange={(e) => set("propiedad", Number(e.target.value))}>
              {propiedades.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.titulo || p.direccion || `Propiedad #${p.id}`}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Contacto (opcional)">
            <select className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
                    value={form.contacto == null ? "" : String(form.contacto)}
                    onChange={(e) => set("contacto", e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Ninguno —</option>
              {contactos.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {(c.nombre || "") + " " + (c.apellido || "")} {c.email ? `• ${c.email}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Nombre (visitante)">
            <input className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
                   value={form.nombre || ""} onChange={(e) => set("nombre", e.target.value)} placeholder="Si no es contacto registrado" />
          </Field>

          <Field label="Apellido (visitante)">
            <input className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
                   value={form.apellido || ""} onChange={(e) => set("apellido", e.target.value)} />
          </Field>

          <Field label="Email (visitante)">
            <input type="email" className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
                   value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
          </Field>

          <div className="md:col-span-2">
            <Field label="Notas">
              <textarea rows={3} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                        value={form.notas || ""} onChange={(e) => set("notas", e.target.value)} />
            </Field>
          </div>
        </div>

        {error && <div className="mt-3 text-sm text-rose-500">{error}</div>}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button className="h-10 px-4 rounded-lg border text-sm" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60"
                  onClick={handleSubmit} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
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
          <button className="h-9 px-3 rounded-lg border text-sm" onClick={onCancel} disabled={working}>Cancelar</button>
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
      <div className={`w-full max-w-md rounded-2xl border p-5 shadow-lg ${
          ok ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
             : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"}`}
           onClick={(e) => e.stopPropagation()}>
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
