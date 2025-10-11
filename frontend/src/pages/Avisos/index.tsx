import { useEffect, useState } from "react";
import api from "../../lib/api";

type Aviso = {
  id: number;
  titulo?: string;
  descripcion?: string;
  creado_en?: string;
};

export default function AvisosPage() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get("/api/avisos/");
        // Normaliza: si la API devuelve array directo o {results: [...]}
        const list: unknown =
          Array.isArray(data) ? data : (data && (data.results ?? data.data));
        const safeArray: Aviso[] = Array.isArray(list) ? list : [];
        if (mounted) setAvisos(safeArray);
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.detail || e?.message || "Error cargando avisos");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Siempre trabajar con array
  const items = Array.isArray(avisos) ? avisos : [];

  const filtered = q
    ? items.filter(a =>
        (a.titulo || "").toLowerCase().includes(q.toLowerCase()) ||
        (a.descripcion || "").toLowerCase().includes(q.toLowerCase())
      )
    : items;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Avisos</h1>

      <div className="mb-4 flex items-center gap-2">
        <input
          className="h-10 w-full rounded-xl border rc-border rc-border rc-card px-3 text-sm"
          placeholder="Buscar por título o descripción…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <div className="text-sm rc-muted">Cargando…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-sm rc-muted">No hay avisos.</div>
      )}

      <ul className="space-y-3">
        {filtered.map((a) => (
          <li key={a.id} className="rounded-xl border rc-border rc-border p-4">
            <div className="font-medium">{a.titulo || `Aviso #${a.id}`}</div>
            {a.descripcion && <div className="text-sm rc-muted dark:text-gray-300 mt-1">{a.descripcion}</div>}
            {a.creado_en && (
              <div className="text-xs rc-muted mt-2">
                Creado: {new Date(a.creado_en).toLocaleString()}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
   