// src/pages/Leads/index.tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

/* ----------------------------- Types ----------------------------- */
type EstadoLead = { id: number; fase: string; descripcion?: string };
type Contacto = {
  id: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  estado?: EstadoLead | number | null;
};
type Evento = {
  id: number;
  tipo: "Reunion" | "Visita" | "Llamada";
  fecha_hora: string;
  contacto?: number | null;
  email?: string | null;
};
/** ✅ Ítem de historial de cambios de estado */
type HistItem = {
  id: number;
  contacto: number;
  estado: EstadoLead | null;
  changed_at: string; // ISO
};

/* --------------------------- Utils / UI --------------------------- */
const STATE_COLORS: Record<string, string> = {
  "en negociación": "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  negociacion: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  rechazado: "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30",
  vendido: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  nuevo: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30",
};

const norm = (s?: string | null) =>
  (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

const formatDate = (d?: Date | string | null, withTime = false) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const base = date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  if (!withTime) return base;
  const h = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return `${base} ${h}`;
};

/* ----------------------------- Page ------------------------------ */
export default function LeadsPage() {
  const [loading, setLoading] = useState(true);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [estados, setEstados] = useState<EstadoLead[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [openAdd, setOpenAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Contacto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contacto | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  /** ✅ Modal de historial */
  const [historyFor, setHistoryFor] = useState<Contacto | null>(null);
  const [historyItems, setHistoryItems] = useState<HistItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const PAGE_SIZE = 10;

  async function fetchAll() {
    setLoading(true);
    try {
      const [cRes, eRes, evRes] = await Promise.all([
        api.get("contactos/"),
        api.get("estados-lead/"),
        api.get("eventos/"),
      ]);
      const toArr = (d: any) =>
        Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : [];
      setContactos(toArr(cRes.data));
      setEstados(toArr(eRes.data));
      setEventos(toArr(evRes.data));
    } catch (e) {
      console.error(e);
      setContactos([]);
      setEstados([]);
      setEventos([]);
      setResult({ ok: false, msg: "No se pudo cargar leads/estados/eventos." });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchAll();
  }, []);

  const estadoById = useMemo(() => {
    const m = new Map<number, EstadoLead>();
    estados.forEach((e) => m.set(e.id, e));
    return m;
  }, [estados]);

  const evByContacto = useMemo(() => {
    const m = new Map<number, Evento[]>();
    for (const ev of eventos) {
      if (ev.contacto != null) {
        if (!m.has(ev.contacto)) m.set(ev.contacto, []);
        m.get(ev.contacto)!.push(ev);
      }
    }
    return m;
  }, [eventos]);

  const evByEmail = useMemo(() => {
    const m = new Map<string, Evento[]>();
    for (const ev of eventos) {
      const key = norm(ev.email || "");
      if (!key) continue;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(ev);
    }
    return m;
  }, [eventos]);

  function getUltimoYProximo(c: Contacto) {
    const arr =
      (c.id && evByContacto.get(c.id)) ||
      (c.email && evByEmail.get(norm(c.email))) ||
      [];
    if (!arr.length) return { ultimo: null as Date | null, proximo: null as Date | null };
    const sorted = [...arr].sort(
      (a, b) => +new Date(a.fecha_hora) - +new Date(b.fecha_hora)
    );
    const now = new Date();
    let ultimo: Date | null = null;
    let proximo: Date | null = null;
    for (const e of sorted) {
      const d = new Date(e.fecha_hora);
      if (d <= now) ultimo = d;
      else {
        proximo = d;
        break;
      }
    }
    return { ultimo, proximo };
  }

  const rows = useMemo(() => {
    let base = contactos.map((c) => {
      const est =
        typeof c.estado === "number"
          ? estadoById.get(c.estado)
          : (c.estado as EstadoLead | undefined);
      const { ultimo, proximo } = getUltimoYProximo(c);
      return { ...c, estadoFase: est?.fase || "Nuevo", ultimo, proximo };
    });
    if (q.trim()) {
      const qq = norm(q);
      base = base.filter((c) =>
        [c.nombre, c.apellido, c.email, c.telefono]
          .map((x) => norm(String(x || "")))
          .some((s) => s.includes(qq))
      );
    }
    base.sort((a, b) => {
      if (a.proximo && b.proximo) return +a.proximo - +b.proximo;
      if (a.proximo) return -1;
      if (b.proximo) return 1;
      return 0;
    });
    return base;
  }, [contactos, estadoById, q, evByContacto, evByEmail]);

  const kpis = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows)
      counts[norm((r as any).estadoFase)] =
        (counts[norm((r as any).estadoFase)] || 0) + 1;
    return [
      {
        label: "Lead en negociación",
        value: counts["en negociacion"] || counts["negociacion"] || 0,
      },
      { label: "Lead rechazados", value: counts["rechazado"] || 0 },
      { label: "Lead vendidos", value: counts["vendido"] || 0 },
    ];
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [q]);

  /* ------------------- Seeder de estados (FIX) -------------------- */
  async function seedEstados() {
    try {
      await Promise.all([
        api.post("estados-lead/", { fase: "Nuevo", descripcion: "" }),
        api.post("estados-lead/", { fase: "En negociación", descripcion: "" }),
        api.post("estados-lead/", { fase: "Rechazado", descripcion: "" }),
        api.post("estados-lead/", { fase: "Vendido", descripcion: "" }),
      ]);
      const eRes = await api.get("estados-lead/");
      const toArr = (d: any) =>
        Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : [];
      setEstados(toArr(eRes.data));
      setResult({ ok: true, msg: "Estados cargados correctamente." });
    } catch (e) {
      console.error(e);
      setResult({ ok: false, msg: "No se pudieron cargar los estados recomendados." });
    }
  }

  /* ✅ Abrir modal y traer historial */
  async function openHistory(c: Contacto) {
    setHistoryFor(c);
    setHistoryItems(null);
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`contactos/${c.id}/estado-historial/`);
      setHistoryItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  /* ----------------------------- UI ------------------------------ */
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Gestión de Lead</h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Administra tus leads, próximos contactos y estado comercial.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {estados.length < 4 && (
            <button
              className="h-9 px-3 rounded-lg border text-sm"
              onClick={seedEstados}
              title="Crear Nuevo / En negociación / Rechazado / Vendido"
            >
              Cargar estados recomendados
            </button>
          )}
          <button
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 h-9"
            onClick={() => setOpenAdd(true)}
          >
            + Añadir
          </button>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-4"
          >
            <div className="text-3xl font-semibold">{k.value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {k.label}
            </div>
          </div>
        ))}
      </section>

      {/* Search */}
      <div className="relative w/full md:max-w-md">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full h-10 rounded-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-3 text-sm outline-none focus:ring-2 ring-blue-500"
        />
        {q && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
            onClick={() => setQ("")}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla (desktop) */}
      <div className="hidden md:block rounded-2xl overflow-hidden border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300">
            <tr>
              <th className="text-left font-medium px-4 py-3">Nombre</th>
              <th className="text-left font-medium px-4 py-3">Apellido</th>
              <th className="text-left font-medium px-4 py-3">Teléfono</th>
              <th className="text-left font-medium px-4 py-3">Último contacto</th>
              <th className="text-left font-medium px-4 py-3">Email</th>
              <th className="text-left font-medium px-4 py-3">Próximo contacto</th>
              <th className="text-left font-medium px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Sin resultados.
                </td>
              </tr>
            )}
            {!loading &&
              pageRows.map((c) => {
                const stateKey = norm((c as any).estadoFase);
                const badge =
                  STATE_COLORS[stateKey] ||
                  "bg-gray-500/15 text-gray-400 ring-1 ring-gray-500/20";
                return (
                  <tr
                    key={c.id}
                    className="border-t border-gray-100 dark:border-gray-900"
                  >
                    <td className="px-4 py-3">{c.nombre || "—"}</td>
                    <td className="px-4 py-3">{c.apellido || "—"}</td>
                    <td className="px-4 py-3">{c.telefono || "—"}</td>
                    <td className="px-4 py-3">
                      {formatDate((c as any).ultimo, true)}
                    </td>
                    <td className="px-4 py-3">{c.email || "—"}</td>
                    <td className="px-4 py-3">
                      {formatDate((c as any).proximo, true)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${badge}`}
                      >
                        {(c as any).estadoFase}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          className="h-8 px-2 rounded-md border border-gray-300 dark:border-gray-700 text-xs"
                          onClick={() => setEditTarget(c)}
                        >
                          Editar
                        </button>
                        <button
                          className="h-8 px-2 rounded-md border border-rose-600/40 text-rose-500 text-xs"
                          onClick={() => setDeleteTarget(c)}
                        >
                          Borrar
                        </button>
                        {/* ✅ Historial */}
                        <button
                          className="h-8 px-2 rounded-md border text-xs"
                          onClick={() => openHistory(c)}
                        >
                          Historial
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>

        {/* Paginación */}
        <div className="flex items-center justify-center gap-2 p-3 border-t border-gray-100 dark:border-gray-900">
          <button
            className="h-8 px-3 rounded-md border text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ‹
          </button>
          <div className="text-sm">
            Página <span className="font-medium">{page}</span> de{" "}
            <span className="font-medium">{totalPages}</span>
          </div>
          <button
            className="h-8 px-3 rounded-md border text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            ›
          </button>
        </div>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-3">
        {loading && <div className="text-sm text-gray-500">Cargando…</div>}
        {!loading && rows.length === 0 && (
          <div className="text-sm text-gray-500">Sin resultados.</div>
        )}
        {!loading &&
          rows.map((c) => {
            const stateKey = norm((c as any).estadoFase);
            const badge =
              STATE_COLORS[stateKey] ||
              "bg-gray-500/15 text-gray-400 ring-1 ring-gray-500/20";
            return (
              <div
                key={c.id}
                className="rounded-xl border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">
                    {(c.nombre || "—") + " " + (c.apellido || "")}
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${badge}`}
                  >
                    {(c as any).estadoFase}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div>
                    <div className="text-gray-400">Teléfono</div>
                    <div className="dark:text-gray-300/90">{c.telefono || "—"}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Email</div>
                    <div className="truncate">{c.email || "—"}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Último contacto</div>
                    <div>{formatDate((c as any).ultimo, true)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Próximo contacto</div>
                    <div>{formatDate((c as any).proximo, true)}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    className="h-8 px-3 rounded-md border text-xs"
                    onClick={() => setEditTarget(c)}
                  >
                    Editar
                  </button>
                  <button
                    className="h-8 px-3 rounded-md border border-rose-600/40 text-rose-500 text-xs"
                    onClick={() => setDeleteTarget(c)}
                  >
                    Borrar
                  </button>
                  {/* ✅ Historial (mobile) */}
                  <button
                    className="h-8 px-3 rounded-md border text-xs"
                    onClick={() => openHistory(c)}
                  >
                    Historial
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Modales */}
      {openAdd && (
        <LeadModal
          title="Nuevo Lead"
          estados={estados}
          onClose={() => setOpenAdd(false)}
          onSubmit={async (payload) => {
            try {
              await saveContacto("contactos/", "post", payload);
              await fetchAll();
              setOpenAdd(false);
              setResult({ ok: true, msg: "Lead creado correctamente." });
            } catch (e) {
              console.error(e);
              setResult({ ok: false, msg: "No se pudo crear el lead." });
            }
          }}
        />
      )}

      {editTarget && (
        <LeadModal
          title="Editar Lead"
          estados={estados}
          defaultValues={{
            nombre: editTarget.nombre || "",
            apellido: editTarget.apellido || "",
            email: editTarget.email || "",
            telefono: editTarget.telefono || "",
            estadoId:
              (typeof editTarget.estado === "number"
                ? String(editTarget.estado)
                : editTarget.estado?.id
                ? String(editTarget.estado.id)
                : "") || "",
          }}
          onClose={() => setEditTarget(null)}
          onSubmit={async (payload) => {
            try {
              await saveContacto(`contactos/${editTarget.id}/`, "patch", payload);
              await fetchAll();
              setEditTarget(null);
              setResult({ ok: true, msg: "Lead actualizado correctamente." });
            } catch (e) {
              console.error(e);
              setResult({ ok: false, msg: "No se pudo actualizar el lead." });
            }
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Eliminar lead"
          message={`¿Seguro que querés eliminar a "${deleteTarget.nombre ?? ""} ${deleteTarget.apellido ?? ""}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          confirmType="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            try {
              await api.delete(`contactos/${deleteTarget.id}/`);
              await fetchAll();
              setDeleteTarget(null);
              setResult({ ok: true, msg: "Lead eliminado." });
            } catch (e) {
              console.error(e);
              setResult({ ok: false, msg: "No se pudo eliminar el lead." });
            }
          }}
        />
      )}

      {result && (
        <ResultModal ok={result.ok} message={result.msg} onClose={() => setResult(null)} />
      )}

      {/* ✅ Modal de Historial */}
      {historyFor && (
        <HistoryModal
          contacto={historyFor}
          items={historyItems}
          loading={historyLoading}
          onClose={() => {
            setHistoryFor(null);
            setHistoryItems(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------ Guardado robusto ------------------------ */
/** Intenta enviar {estado}; si 400, reintenta con {estado_id}. */
async function saveContacto(
  url: string,
  method: "post" | "patch",
  data: {
    nombre?: string;
    apellido?: string;
    email?: string;
    telefono?: string;
    estado?: number | null;
  }
) {
  try {
    await api({ url, method, data });
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 400) {
      const alt: any = { ...data };
      if (typeof (data as any).estado !== "undefined") {
        alt.estado_id = (data as any).estado;
        delete alt.estado;
      }
      await api({ url, method, data: alt });
    } else {
      throw err;
    }
  }
}

/* ------------------------- Lead Create/Edit ------------------------- */

function LeadModal({
  title,
  estados,
  defaultValues,
  onClose,
  onSubmit,
}: {
  title: string;
  estados: EstadoLead[];
  defaultValues?: {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    estadoId: string;
  };
  onClose: () => void;
  onSubmit: (payload: any) => void | Promise<void>;
}) {
  const [form, setForm] = useState(
    defaultValues || { nombre: "", apellido: "", email: "", telefono: "", estadoId: "" }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nuevoId = useMemo(
    () => estados.find((e) => norm(e.fase) === "nuevo")?.id,
    [estados]
  );

  async function handleSubmit() {
    setError(null);
    if (!form.nombre && !form.email) {
      setError("Ingresá al menos nombre o email.");
      return;
    }
    const estadoElegido = form.estadoId || (nuevoId ? String(nuevoId) : "");
    if (!estadoElegido) {
      setError("No hay estados cargados. Hacé clic en “Cargar estados recomendados”.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        nombre: form.nombre || undefined,
        apellido: form.apellido || undefined,
        email: form.email || undefined,
        telefono: form.telefono || undefined,
        estado: Number(estadoElegido),
      };
      await onSubmit(payload);
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-6 shadow-xl">
        <div className="text-xl font-semibold mb-4">{title}</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre">
            <input
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm outline-none focus:ring-2 ring-blue-500"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            />
          </Field>
          <Field label="Apellido">
            <input
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm outline-none focus:ring-2 ring-blue-500"
              value={form.apellido}
              onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm outline-none focus:ring-2 ring-blue-500"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <Field label="Teléfono">
            <input
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm outline-none focus:ring-2 ring-blue-500"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            />
          </Field>

          <div className="md:col-span-2">
            <label className="block text-xs mb-1">Estado</label>
            <select
              className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm outline-none focus:ring-2 ring-blue-500"
              value={form.estadoId}
              onChange={(e) => setForm((f) => ({ ...f, estadoId: e.target.value }))}
            >
              <option value="">— Seleccionar —</option>
              {estados.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.fase}
                </option>
              ))}
            </select>
            {!nuevoId && (
              <div className="mt-1 text-xs text-amber-500">
                No encuentro el estado “Nuevo”. Hacé clic en “Cargar estados recomendados”.
              </div>
            )}
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-rose-500">{error}</div>}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button className="h-10 px-4 rounded-lg border text-sm" onClick={onClose} disabled={saving}>
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

/* --------------------------- Confirm Modal -------------------------- */

function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmar",
  confirmType = "primary",
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmType?: "primary" | "danger";
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  async function go() {
    setWorking(true);
    await onConfirm();
    setWorking(false);
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
      <div className="w/full max-w-lg rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-6 shadow-xl">
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

/* --------------------------- Result Modal --------------------------- */

function ResultModal({ ok, message, onClose }: { ok: boolean; message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={onClose}>
      <div
        className={`w/full max-w-md rounded-2xl border p-5 shadow-lg ${
          ok
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
            : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"
        }`}
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

/* --------------------------- History Modal --------------------------- */

function HistoryModal({
  contacto,
  items,
  loading,
  onClose,
}: {
  contacto: Contacto;
  items: HistItem[] | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w/full max-w-2xl rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-semibold mb-1">
          Historial de {contacto.nombre || "—"} {contacto.apellido || ""}
        </div>
        <div className="text-xs text-gray-500 mb-4">{contacto.email || "—"}</div>

        {loading && <div className="text-sm text-gray-500">Cargando…</div>}
        {!loading && (items?.length ?? 0) === 0 && (
          <div className="text-sm text-gray-500">Este lead aún no tiene cambios de estado.</div>
        )}

        {!loading && !!items && items.length > 0 && (
          <ul className="relative pl-5">
            {items.map((h, idx) => {
              const fase = h.estado?.fase || "—";
              const key = norm(fase);
              const chip =
                STATE_COLORS[key] || "bg-gray-500/15 text-gray-400 ring-1 ring-gray-500/20";
              return (
                <li key={h.id} className="pb-4 last:pb-0">
                  {idx !== items.length - 1 && (
                    <span className="absolute left-2 top-3 h-full w-px bg-gray-200 dark:bg-gray-800" />
                  )}
                  <span className="absolute left-0 mt-1 h-2 w-2 rounded-full bg-gray-400" />
                  <div className="ml-4">
                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${chip}`}>
                      {fase}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{formatDate(h.changed_at, true)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5 text-right">
          <button className="h-9 px-3 rounded-lg border text-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ UI bits ----------------------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1">{label}</label>
      {children}
    </div>
  );
}
