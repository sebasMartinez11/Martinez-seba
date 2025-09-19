import { useEffect, useState } from "react";
import { Usuario, fetchUsuarios } from "@/lib/api";

export default function UsuariosList() {
  const [items, setItems] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchUsuarios();
        setItems(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-neutral-800">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-neutral-900/60">
          <tr>
            <Th>ID</Th>
            <Th>Usuario</Th>
            <Th>Email</Th>
            <Th>Nombre</Th>
            <Th>Teléfono</Th>
            <Th>DNI</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} className="p-4">Cargando…</td></tr>
          ) : items.length === 0 ? (
            <tr><td colSpan={6} className="p-4">Sin usuarios</td></tr>
          ) : (
            items.map(u => (
              <tr key={u.id} className="border-t border-gray-100 dark:border-neutral-800">
                <Td>{u.id}</Td>
                <Td>{u.username ?? "—"}</Td>
                <Td>{u.email ?? "—"}</Td>
                <Td>{[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}</Td>
                <Td>{(u as any).telefono ?? "—"}</Td>
                <Td>{(u as any).dni ?? "—"}</Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const Th = ({ children }: { children: any }) => (
  <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-300">{children}</th>
);
const Td = ({ children }: { children: any }) => (
  <td className="px-3 py-2">{children}</td>
);
