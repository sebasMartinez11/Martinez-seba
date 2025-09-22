import { useEffect, useState } from "react";
import { Propiedad, fetchPropiedades } from "@/lib/api";

export default function PropiedadesList() {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [moneda, setMoneda] = useState("");
  const [items, setItems] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(false);

  async function load(params: Record<string, any> = {}) {
    setLoading(true);
    try {
      const data = await fetchPropiedades(params);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load({}); }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título/ubicación…"
          className="rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
        />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}
          className="rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm">
          <option value="">Tipo</option>
          <option value="casa">Casa</option>
          <option value="departamento">Departamento</option>
          <option value="hotel">Hotel</option>
        </select>
        <select value={moneda} onChange={(e) => setMoneda(e.target.value)}
          className="rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm">
          <option value="">Moneda</option>
          <option value="USD">USD</option>
          <option value="ARS">ARS</option>
        </select>
        <button
          onClick={() => load({ q, tipo, moneda })}
          className="rounded-xl bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700">
          Filtrar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="p-4">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="p-4">Sin propiedades</div>
        ) : (
          items.map((p) => (
            <div key={p.id} className="rounded-2xl border border-gray-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900">
              <div className="text-xs text-gray-500">{p.codigo} • {p.tipo_de_propiedad.toUpperCase()}</div>
              <div className="mt-1 text-lg font-semibold">{p.titulo}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{p.ubicacion}</div>
              <div className="mt-3 text-sm">
                <span className="font-medium">{Number(p.precio).toLocaleString()} {p.moneda}</span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full border border-gray-300 dark:border-neutral-700">
                  {p.estado}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {p.ambiente} amb • {p.banos} baños • {p.superficie} m²
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
