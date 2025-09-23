import axios from "axios";
import { useEffect, useState } from "react";

type Propiedad = {
  id: number;
  titulo?: string;
  precio?: string | number;
  ciudad?: string;
  imagen?: string;
};

function toArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.results)) return data.results as T[];
  return [];
}

export default function PropiedadesPage() {
  const [items, setItems] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/api/propiedades/")
      .then((res) => setItems(toArray<Propiedad>(res.data)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Propiedades</h2>

      {loading ? (
        <div className="text-sm">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No hay propiedades todavía. Creá la primera desde “Nueva Propiedad”.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950"
            >
              {p.imagen ? (
                <img src={p.imagen} alt={p.titulo} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gray-100 dark:bg-gray-800" />
              )}
              <div className="p-3 space-y-1">
                <div className="font-medium">{p.titulo ?? `Propiedad #${p.id}`}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {p.ciudad ?? "-"} • {p.precio ?? "-"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
