import { useEffect, useState } from "react";
import api from "../../lib/api";

type Aviso = {
  id: number;
  titulo: string;
  descripcion?: string;
  fecha?: string;
  estado?: string;
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
      try {
        const { data } = await api.get("/api/avisos/");
        const list: unknown =
          Array.isArray(data) ? data : (data && (data.results ?? data.data));
        const safeArray: Aviso[] = Array.isArray(list) ? list : [];
        if (mounted) setAvisos(safeArray);
      } catch (e: any) {
        if (mounted)
          setError(e?.response?.data?.detail || e?.message || "Error cargando avisos");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const filtered = q
    ? avisos.filter(a =>
        (a.titulo || "").toLowerCase().includes(q.toLowerCase()) ||
        (a.descripcion || "").toLowerCase().includes(q.toLowerCase())
      )
    : avisos;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Avisos</h1>

      <div className="mb-4 flex items-center gap-2">
        <input
          className="h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm"
          placeholder="Buscar por título o descripción…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <div className="text-sm text-gray-500">Cargando…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-sm text-gray-500">No hay avisos.</div>
      )}

      <ul className="space-y-3">
        {filtered.map((a) => (
          <li
            key={a.id}
            className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900"
          >
            <div className="font-medium text-lg">{a.titulo}</div>
            {a.descripcion && (
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {a.descripcion}
              </div>
            )}
            <div className="mt-2 text-xs text-gray-500 flex gap-3">
              {a.fecha && <>📅 {new Date(a.fecha).toLocaleString()}</>}
              {a.estado && <span>• Estado: {a.estado}</span>}
              {a.creado_en && (
                <span>• Creado: {new Date(a.creado_en).toLocaleDateString()}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
