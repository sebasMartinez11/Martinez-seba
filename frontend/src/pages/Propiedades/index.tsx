import axios from "axios";
import { useEffect, useState } from "react";
import PropiedadCreateModal from "./PropiedadCreateModal";

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

export default function PropiedadesPage() {
  const [items, setItems] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Propiedades</h2>
        <button
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center rounded-md px-3 h-9 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          Registrar propiedad
        </button>
      </div>

      {loading ? (
        <div className="text-sm">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No hay propiedades todavía. Creá la primera.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {items.map((p) => {
            const img = firstImage(p);
            const tipo = badgeTipo(p.tipo_de_propiedad);
            return (
              <article
                key={p.id}
                className="rounded-xl overflow-hidden bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 flex flex-col"
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
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {p.ubicacion}
                  </div>
                  <h3 className="font-semibold leading-snug">{p.titulo}</h3>
                  <div className="text-sm">{money(p.precio, p.moneda)}</div>
                  {p.disponibilidad ? (
                    <div className="text-xs text-gray-500">{p.disponibilidad}</div>
                  ) : null}
                  {p.descripcion ? (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {p.descripcion}
                    </p>
                  ) : null}
                </div>

                {/* Footer */}
                <div className="mt-auto px-3 py-2 text-[11px] text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 flex gap-4">
                  <span>Amb: {p.ambiente}</span>
                  <span>Baños: {p.banos}</span>
                  <span>Sup: {p.superficie} m²</span>
                  <span>Cód: {p.codigo}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <PropiedadCreateModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => fetchProps()}
      />
    </div>
  );
}
