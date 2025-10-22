import axios from "axios";
import { useEffect, useState } from "react";

type Usuario = {
  id: number;
  username?: string;
  email?: string;
};

function toArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.results)) return data.results as T[];
  return [];
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/api/usuarios/")
      .then((res) => setUsers(toArray<Usuario>(res.data)))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Usuarios</h2>
      <div className="rounded-xl border rc-border rc-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100/70 dark:bg-gray-800/50">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Usuario</th>
              <th className="text-left px-3 py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3" colSpan={3}>Cargando…</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center rc-muted rc-muted" colSpan={3}>
                  No hay usuarios aún.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b rc-border rc-border">
                  <td className="px-3 py-2">{u.id}</td>
                  <td className="px-3 py-2">{u.username ?? "-"}</td>
                  <td className="px-3 py-2">{u.email ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
