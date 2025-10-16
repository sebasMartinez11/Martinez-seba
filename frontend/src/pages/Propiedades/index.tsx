
import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import PropiedadCreateModal from "./PropiedadCreateModal";

/* ============================== Types ============================== */
type PropiedadImagen = { id: number; imagen: string; descripcion?: string | null };
type Propiedad = {
  id: number;
  codigo: string;
  titulo: string;
  descripcion?: string;
  ubicacion: string;
  tipo_de_propiedad: "casa" | "departamento" | "hotel";
  disponibilidad?: string;
  precio: number | string;
  moneda: "USD" | "ARS";
  ambiente: number;
  antiguedad: number;
  banos: number;
  superficie: number | string;
  estado: "disponible" | "vendido" | "reservado";
  imagenes?: PropiedadImagen[];
};

/* ============================ Helpers ============================= */
function toArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.results)) return data.results as T[];
  return [];
}

const BACKEND_ORIGIN =
  (import.meta as any).env?.VITE_BACKEND_ORIGIN || "http://127.0.0.1:8000";

function absMedia(url?: string | null) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BACKEND_ORIGIN}${url}`;
}

function firstImage(p: Propiedad): string | null {
  const raw = p.imagenes && p.imagenes.length ? p.imagenes[0].imagen : null;
  const abs = absMedia(raw);
  return abs || null;
}

function money(n: number | string, moneda: "USD" | "ARS") {
  const num = typeof n === "string" ? Number(n) : n;
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${moneda} ${num}`;
  }
}

function badgeEstado(estado: Propiedad["estado"]) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium";
  if (estado === "disponible")
    return `${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`;
  if (estado === "reservado")
    return `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300`;
  return `${base} bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200`;
}

function badgeTipo(tipo: Propiedad["tipo_de_propiedad"]) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  const label =
    tipo === "casa" ? "Casa" : tipo === "departamento" ? "Departamento" : "Hotel";
  return { className: base, label };
}

const norm = (s?: string | number | null) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

/* Normaliza cualquier texto a 'venta' o 'alquiler' (fallback: venta) */
const asDisponibilidad = (s?: string | null) => {
  const n = (s ?? "").toString().toLowerCase();
  if (n.startsWith("alq")) return "alquiler";
  if (n.startsWith("ven")) return "venta";
  return "venta";
};

/* ============================== Page ============================== */
export default function PropiedadesPage() {
  const [items, setItems] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);

  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Propiedad | null>(null);
  const [editTarget, setEditTarget] = useState<Propiedad | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Propiedad | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function fetchProps() {
    setLoading(true);
    try {
      const res = await axios.get("/api/propiedades/");
      setItems(toArray<Propiedad>(res.data));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProps();
  }, []);

  // Copiar @Propiedad <id>
  async function copyPropTag(p: Propiedad) {
    const tag = `@Propiedad ${p.id}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(tag);
      } else {
        // Fallback
        const ta = document.createElement("textarea");
        ta.value = tag;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setResult({ ok: true, msg: `Copiado: ${tag}` });
    } catch {
      setResult({ ok: false, msg: "No se pudo copiar al portapapeles." });
    }
  }

  /* ---------------------- Smart search (client) --------------------- */
  const filtered = useMemo(() => {
    const query = norm(q);
    if (!query) return items;

    const tokens = query.split(/\s+/).filter(Boolean);

    return items.filter((p) => {
      const indexable = [
        p.titulo,
        p.descripcion,
        p.ubicacion,
        p.codigo,
        p.disponibilidad,
        p.tipo_de_propiedad,
        p.estado,
        p.moneda,
        p.precio,
        `${p.ambiente} amb`,
        `${p.ambiente} ambientes`,
        `${p.ambiente} hab`,
        `${p.banos} banos`,
        `${p.banos} baños`,
        `${p.superficie} m2`,
        `${p.superficie} m²`,
        `${p.antiguedad} anos`,
        `${p.antiguedad} años`,
      ]
        .map(norm)
        .join(" | ");

      return tokens.every((t) => {
        if (/^\d+\s*(m2|m²)$/.test(t)) {
          const n = Number(t.replace(/[^\d]/g, ""));
          const sup = Number(p.superficie);
          return sup ? Math.round(sup) === n : false;
        }
        if (/^\d+\s*amb/.test(t)) {
          const n = Number(t.replace(/[^\d]/g, ""));
          return Number(p.ambiente) === n;
        }
        if (/^\d+\s*ban/.test(t) || /^\d+\s*bañ/.test(t)) {
          const n = Number(t.replace(/[^\d]/g, ""));
          return Number(p.banos) === n;
        }
        if (/^\d+$/.test(t)) {
          const n = Number(t);
          if (Number(p.ambiente) === n) return true;
          if (Number(p.banos) === n) return true;
          if (Number(p.antiguedad) === n) return true;
          if (norm(p.codigo).includes(t)) return true;
          if (String(p.precio).includes(t)) return true;
          return indexable.includes(t);
        }
        return indexable.includes(t);
      });
    });
  }, [items, q]);

  /* ------------------------------ UI ------------------------------ */
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Propiedades</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título, ubicación, código, '3 amb', '100m2', usd…"
              className="rc-input h-10 w-full"
            />
            {q && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs rc-muted"
                onClick={() => setQ("")}
              >
                Limpiar
              </button>
            )}
          </div>
          <button
            onClick={() => setOpenCreate(true)}
            className="inline-flex items-center rounded-md px-3 h-9 text-sm font-medium bg-blue-600 rc-text rc-text hover:bg-blue-700"
          >
            Registrar propiedad
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm rc-muted rc-muted">
          No hay propiedades que coincidan con tu búsqueda.
        </div>
      ) : (
        //  Card fija de 22rem por columna, alineada a la izquierda
        <div className="grid [grid-template-columns:repeat(auto-fill,minmax(22rem,22rem))] gap-4">
          {filtered.map((p) => {
            const img = firstImage(p);
            const tipo = badgeTipo(p.tipo_de_propiedad);
            return (
              <article
                key={p.id}
                className="rounded-xl overflow-hidden rc-card rc-text flex flex-col"
              >
                {/* Imagen */}
                <div className="relative h-40 bg-gray-200 dark:bg-gray-800">
                  {img ? (
                    <img
                      src={img}
                      alt={p.titulo}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="absolute top-2 left-2 flex gap-2">
                    <span className={tipo.className}>{tipo.label}</span>
                    <span className={badgeEstado(p.estado)}>
                      {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-3 space-y-1">
                  <div className="text-sm rc-muted rc-muted">
                    {p.ubicacion}
                  </div>
                  <h3 className="font-semibold leading-snug">{p.titulo}</h3>
                  <div className="text-sm">{money(p.precio, p.moneda)}</div>
                  {p.disponibilidad ? (
                    <div className="text-xs rc-muted capitalize">{p.disponibilidad}</div>
                  ) : null}
                  {p.descripcion ? (
                    <p className="text-xs rc-muted line-clamp-2">
                      {p.descripcion}
                    </p>
                  ) : null}
                </div>

                {/* Footer: dos filas (datos arriba, botones abajo) */}
                <div className="mt-auto px-3 py-3 text-[11px] rc-muted rc-muted border-t rc-border rc-border">
                  {/* fila 1: datos en grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <div className="rounded-md border px-2 py-1 bg-white/5 text-[11px] min-w-0">
                      <div className="text-[10px] rc-muted">Ambientes</div>
                      <div className="font-medium">{p.ambiente}</div>
                    </div>
                    <div className="rounded-md border px-2 py-1 bg-white/5 text-[11px] min-w-0">
                      <div className="text-[10px] rc-muted">Baños</div>
                      <div className="font-medium">{p.banos}</div>
                    </div>
                    <div className="rounded-md border px-2 py-1 bg-white/5 text-[11px] min-w-0">
                      <div className="text-[10px] rc-muted">Superficie</div>
                      <div className="font-medium">{p.superficie} m²</div>
                    </div>
                    <div className="rounded-md border px-2 py-1 bg-white/5 text-[11px] min-w-0">
                      <div className="text-[10px] rc-muted">Cód</div>
                      <div className="font-medium">{p.codigo}</div>
                    </div>
                  </div>

                  {/* fila 2: botones */}
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <button
                      className="h-8 px-3 rounded-md border text-[11px] whitespace-nowrap"
                      onClick={() => setDetail(p)}
                    >
                      Ver
                    </button>
                    <button
                      className="h-8 px-3 rounded-md border text-[11px] whitespace-nowrap"
                      onClick={() => setEditTarget(p)}
                    >
                      Editar
                    </button>
                    <button
                      className="h-8 px-3 rounded-md border border-rose-600/40 text-rose-500 text-[11px] whitespace-nowrap"
                      onClick={() => setDeleteTarget(p)}
                    >
                      Borrar
                    </button>
                    <button
                      className="h-8 px-3 rounded-md border rc-border text-[11px] hover:bg-[rgb(var(--card))/0.6] whitespace-nowrap"
                      title="Copiar etiqueta para pegar en el asistente"
                      onClick={() => copyPropTag(p)}
                    >
                      @Propiedad {p.id}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Crear */}
      <PropiedadCreateModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => fetchProps()}
      />

      {/* Detalle */}
      {detail && (
        <PropiedadDetailModal
          propiedad={detail}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditTarget(detail);
            setDetail(null);
          }}
          onDelete={() => {
            setDeleteTarget(detail);
            setDetail(null);
          }}
          // Pasamos util para copiar desde el modal
          onCopyTag={() => copyPropTag(detail)}
        />
      )}

      {/* Editar */}
      {editTarget && (
        <PropiedadEditModal
          propiedad={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            fetchProps();
            setResult({ ok: true, msg: "Propiedad actualizada." });
          }}
        />
      )}

      {/* Eliminar */}
      {deleteTarget && (
        <ConfirmModal
          title="Eliminar propiedad"
          message={`¿Seguro que querés eliminar "${deleteTarget.titulo}" (cód: ${deleteTarget.codigo})? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          confirmType="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            try {
              await axios.delete(`/api/propiedades/${deleteTarget.id}/`);
              setDeleteTarget(null);
              await fetchProps();
              setResult({ ok: true, msg: "Propiedad eliminada." });
            } catch (e) {
              console.error(e);
              setResult({ ok: false, msg: "No se pudo eliminar la propiedad." });
            }
          }}
        />
      )}

      {/* Toast */}
      {result && (
        <ResultModal ok={result.ok} message={result.msg} onClose={() => setResult(null)} />
      )}
    </div>
  );
}

/* ========================= Detail Modal ========================= */
function PropiedadDetailModal({
  propiedad,
  onClose,
  onEdit,
  onDelete,
  onCopyTag,
}: {
  propiedad: Propiedad;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopyTag: () => void;
}) {
  const imgs = (propiedad.imagenes || []).map((x) => absMedia(x.imagen)).filter(Boolean) as string[];
  const [active, setActive] = useState(0);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-5xl rounded-2xl rc-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-semibold">{propiedad.titulo}</div>
            <div className="text-xs rc-muted">{propiedad.ubicacion}</div>
          </div>
          <div className="flex gap-2">
            <button className="h-9 px-3 rounded-lg border text-sm" onClick={onCopyTag}>
              Copiar @Propiedad {propiedad.id}
            </button>
            <button className="h-9 px-3 rounded-lg border text-sm" onClick={onEdit}>Editar</button>
            <button className="h-9 px-3 rounded-lg border border-rose-600/40 text-rose-500 text-sm" onClick={onDelete}>Borrar</button>
            <button className="h-9 px-3 rounded-lg border text-sm" onClick={onClose}>Cerrar</button>
          </div>
        </div>

        {/* Galería simple */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl overflow-hidden border rc-border h-64 bg-[rgb(var(--card))/0.5]">
            {imgs.length ? (
              <img src={imgs[active]} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-sm rc-muted">Sin imágenes</div>
            )}
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-semibold">{money(propiedad.precio, propiedad.moneda)}</div>
            <div className="flex gap-2">
              <span className={badgeEstado(propiedad.estado)}>{propiedad.estado}</span>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {propiedad.tipo_de_propiedad}
              </span>
              {propiedad.disponibilidad && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium rc-muted bg-[rgb(var(--card))/0.5]">
                  {propiedad.disponibilidad}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
              <Info label="Ambientes" value={propiedad.ambiente} />
              <Info label="Baños" value={propiedad.banos} />
              <Info label="Superficie" value={`${propiedad.superficie} m²`} />
              <Info label="Antigüedad" value={`${propiedad.antiguedad} años`} />
              <Info label="Código" value={propiedad.codigo} />
              <Info label="Moneda" value={propiedad.moneda} />
            </div>

            {propiedad.descripcion && (
              <div className="mt-3 text-sm rc-muted dark:text-gray-300">{propiedad.descripcion}</div>
            )}

            {imgs.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {imgs.map((src, i) => (
                  <button
                    key={i}
                    className={`h-16 w-24 rounded-lg overflow-hidden border ${i === active ? "ring-2 ring-blue-500" : ""}`}
                    onClick={() => setActive(i)}
                  >
                    <img src={src} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border rc-border p-2 bg-[rgb(var(--card))/0.5]">
      <div className="text-[10px] rc-muted uppercase">{label}</div>
      <div className="text-sm">{String(value)}</div>
    </div>
  );
}

/* ========================== Edit Modal =========================== */
function PropiedadEditModal({
  propiedad,
  onClose,
  onSaved,
}: {
  propiedad: Propiedad;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Propiedad>({
    ...propiedad,
    disponibilidad: asDisponibilidad(propiedad.disponibilidad),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);

  function set<K extends keyof Propiedad>(k: K, v: Propiedad[K] | any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        codigo: form.codigo,
        titulo: form.titulo,
        descripcion: form.descripcion,
        ubicacion: form.ubicacion,
        tipo_de_propiedad: form.tipo_de_propiedad,
        disponibilidad: asDisponibilidad(form.disponibilidad), // <-- SELECT normalizado
        precio: Number(form.precio),
        moneda: form.moneda,
        ambiente: Number(form.ambiente),
        antiguedad: Number(form.antiguedad),
        banos: Number(form.banos),
        superficie: Number(form.superficie),
        estado: form.estado,
      };
      await axios.patch(`/api/propiedades/${form.id}/`, payload);

      const f = fileRef.current?.files?.[0];
      if (f) {
        const fd = new FormData();
        fd.append("imagen", f);
        await axios.post(`/api/propiedades/${form.id}/subir-imagenes/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      onSaved();
    } catch (e) {
      console.error(e);
      setError("No se pudo guardar la propiedad. Verificá los datos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl rounded-2xl rc-card p-6 shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xl font-semibold mb-4">Editar propiedad</div>

        {error && (
          <div className="mb-3 rounded-md border px-3 py-2 text-sm border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-7 space-y-3">
            <Row label="Código">
              <input className="rc-input h-10 w-full"
                     value={form.codigo} onChange={(e) => set("codigo", e.target.value)} />
            </Row>
            <Row label="Título">
              <input className="rc-input h-10 w-full"
                     value={form.titulo} onChange={(e) => set("titulo", e.target.value)} />
            </Row>
            <Row label="Ubicación">
              <input className="rc-input h-10 w-full"
                     value={form.ubicacion} onChange={(e) => set("ubicacion", e.target.value)} />
            </Row>
            <Row label="Descripción">
              <textarea rows={3} className="rc-input w-full"
                        value={form.descripcion || ""} onChange={(e) => set("descripcion", e.target.value)} />
            </Row>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Row label="Tipo">
                <select className="rc-input h-10 w-full"
                        value={form.tipo_de_propiedad}
                        onChange={(e) => set("tipo_de_propiedad", e.target.value as Propiedad["tipo_de_propiedad"])}>
                  <option value="casa">Casa</option>
                  <option value="departamento">Departamento</option>
                  <option value="ph">Ph</option>
                  <option value="terreno">Terreno</option>
                  <option value="cochera">Cochera</option>
                  <option value="local">Local</option>
                  <option value="oficina">Oficina</option>
                  <option value="consultorio">Consultorio</option>
                  <option value="quinta">Quinta</option>
                  <option value="chacra">Chacra</option>
                  <option value="galpon">Galpon</option>
                  <option value="deposito">Deposito</option>
                  <option value="campo">Campo</option>
                  <option value="hotel">Hotel</option>
                  <option value="fondo de comercio">Fondo de Comercio</option>
                  <option value="edificio">Edificio</option>
                  <option value="otro">Otro</option>

                </select>
              </Row>
              <Row label="Disponibilidad">
                <select
                  className="rc-input h-10 w-full"
                  value={asDisponibilidad(form.disponibilidad)}
                  onChange={(e) => set("disponibilidad", e.target.value)}
                >
                  <option value="venta">Venta</option>
                  <option value="alquiler">Alquiler</option>
                </select>
              </Row>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Row label="Precio">
                <input type="number" min={0} className="w-full h-10 rounded-md border px-3 rc-card border rc-border rc-border rc-text rc-text"
                       value={form.precio} onChange={(e) => set("precio", Number(e.target.value))} />
              </Row>
              <Row label="Moneda">
                <select className="rc-input h-10 w-full"
                        value={form.moneda} onChange={(e) => set("moneda", e.target.value as Propiedad["moneda"])} >
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </Row>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Row label="Ambientes">
                <input type="number" min={0} className="w-full h-10 rounded-md border px-3 rc-card border rc-border rc-border rc-text rc-text"
                       value={form.ambiente} onChange={(e) => set("ambiente", Number(e.target.value))} />
              </Row>
              <Row label="Baños">
                <input type="number" min={0} className="w-full h-10 rounded-md border px-3 rc-card border rc-border rc-border rc-text rc-text"
                       value={form.banos} onChange={(e) => set("banos", Number(e.target.value))} />
              </Row>
              <Row label="Antigüedad">
                <input type="number" min={0} className="w-full h-10 rounded-md border px-3 rc-card border rc-border rc-border rc-text rc-text"
                       value={form.antiguedad} onChange={(e) => set("antiguedad", Number(e.target.value))} />
              </Row>
              <Row label="Superficie (m²)">
                <input type="number" min={0} step="0.01" className="w-full h-10 rounded-md border px-3 rc-card border rc-border rc-border rc-text rc-text"
                       value={form.superficie} onChange={(e) => set("superficie", Number(e.target.value))} />
              </Row>
            </div>

            <Row label="Estado">
              <select className="rc-input h-10 w-full"
                      value={form.estado} onChange={(e) => set("estado", e.target.value as Propiedad["estado"])} >
                <option value="disponible">Disponible</option>
                <option value="vendido">Vendido</option>
                <option value="reservado">Reservado</option>
              </select>
            </Row>
          </div>

          <div className="md:col-span-5 space-y-3">
            <label className="text-sm">Agregar imagen (opcional)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-200"
            />
            <p className="text-xs rc-muted">
              Se agrega a la galería al guardar.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button className="h-10 px-4 rounded-lg border text-sm" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 rc-text rc-text text-sm disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/* ============================ Confirm Modal ============================ */
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
      <div className="w-full max-w-lg rounded-2xl rc-card border rc-border rc-border p-6 shadow-xl">
        <div className="text-lg font-semibold mb-2">{title}</div>
        <div className="text-sm rc-muted dark:text-gray-300">{message}</div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button className="h-9 px-3 rounded-lg border text-sm" onClick={onCancel} disabled={working}>
            Cancelar
          </button>
          <button
            className={
              confirmType === "danger"
                ? "h-9 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 rc-text rc-text text-sm disabled:opacity-60"
                : "h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 rc-text rc-text text-sm disabled:opacity-60"
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
          ok
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
            : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-semibold mb-2">{ok ? "OK" : "Ups"}</div>
        <div className="text-sm">{message}</div>
        <div className="mt-4 text-right">
          <button className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 rc-text rc-text text-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
