import axios from "axios";
import { useEffect, useState } from "react";

type Lead = {
  id: number;
  nombre?: string;
  email?: string;
  telefono?: string;
  estado?: any; // puede venir como objeto {id, fase, descripcion}
};

// normaliza respuesta DRF (paginada o no)
function toArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.results)) return data.results as T[];
  return [];
}

// renderiza valores seguros (objetos incluidos)
function renderCell(v: any) {
  if (v == null) return "-";
  if (typeof v === "object") {
    // heurística: priorizamos campos comunes
    if ("fase" in v && v.fase) return String(v.fase);
    if ("descripcion" in v && v.descripcion) return String(v.descripcion);
    if ("nombre" in v && v.nombre) return String(v.nombre);
    if ("title" in v && v.title) return String(v.title);
    // fallback legible
    try {
      return JSON.stringify(v);
    } catch {
      return "[obj]";
    }
  }
  return String(v);
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/api/contactos/")
      .then((res) => setLeads(toArray<Lead>(res.data)))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Leads</h2>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100/70 dark:bg-gray-800/50">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Nombre</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Teléfono</th>
              <th className="text-left px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3" colSpan={5}>Cargando…</td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500 dark:text-gray-400" colSpan={5}>
                  Sin leads por ahora.
                </td>
              </tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2">{l.id}</td>
                  <td className="px-3 py-2">{renderCell(l.nombre)}</td>
                  <td className="px-3 py-2">{renderCell(l.email)}</td>
                  <td className="px-3 py-2">{renderCell(l.telefono)}</td>
                  <td className="px-3 py-2">{renderCell(l.estado)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
