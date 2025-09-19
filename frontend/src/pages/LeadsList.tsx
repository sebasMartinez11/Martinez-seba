import { useEffect, useState } from "react";
import { Contacto, fetchLeads } from "@/lib/api";

export default function LeadsList() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(false);

  async function load(params: Record<string, any> = {}) {
    setLoading(true);
    try {
      const data = await fetchLeads(params);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load({ q }); /* carga inicial con q="" */ }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono…"
          className="w-full rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
        />
        <button
          onClick={() => load({ q })}
          className="rounded-xl bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700"
        >
          Buscar
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-neutral-900/60">
            <tr>
              <Th>Nombre</Th>
              <Th>Teléfono</Th>
              <Th>Email</Th>
              <Th>Estado</Th>
              <Th>Próximo contacto</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-4">Cargando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="p-4">Sin resultados</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 dark:border-neutral-800">
                  <Td>{[c.nombre, c.apellido].filter(Boolean).join(" ") || "—"}</Td>
                  <Td>{c.telefono || "—"}</Td>
                  <Td>{c.email || "—"}</Td>
                  <Td>{c.estado_fase || "—"}</Td>
                  <Td>{c.proximo_contacto ? new Date(c.proximo_contacto).toLocaleString() : "—"}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Th = ({ children }: { children: any }) => (
  <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">{children}</th>
);
const Td = ({ children }: { children: any }) => (
  <td className="px-3 py-2">{children}</td>
);
