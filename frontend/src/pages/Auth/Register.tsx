import { FormEvent, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";

export default function Register() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dni, setDni] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evitar “heredar” datos viejos
  useEffect(() => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("rc_user_id");
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1) Registrar (público)
      await api.post("auth/register/", {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        password,
        telefono: telefono.trim() || undefined,
        dni: dni.trim() || undefined,
      });

      // 2) Login inmediato
      const { data } = await api.post<{ access: string; refresh?: string }>(
        "auth/token/",
        { username: email.trim(), password }
      );
      localStorage.setItem("access", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);
      if (!localStorage.getItem("rc_theme")) localStorage.setItem("rc_theme", "dark");

      // 3) Obtener mi usuario (sin listar todos)
      const me = await api.get<{ id: number }>("usuarios/me/");
      localStorage.setItem("rc_user_id", String(me.data.id));

      navigate("/app", { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.errors ||
        err?.message ||
        "Error al registrar";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-6">Crear cuenta</h1>

      {error && (
        <div className="mb-4 text-sm rounded-md border border-red-400/40 bg-red-500/10 text-red-200 p-3 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
          />
        </div>
        <div>
          <label className="text-sm">Apellido</label>
          <input
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
          />
        </div>
        <div>
          <label className="text-sm">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
          />
        </div>
        <div>
          <label className="text-sm">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
          />
        </div>
        <div>
          <label className="text-sm">Teléfono (opcional)</label>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
          />
        </div>
        <div>
          <label className="text-sm">DNI (opcional)</label>
          <input
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
          />
        </div>

        <button
          disabled={loading}
          className="w-full rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        ¿Ya tenés cuenta? <Link to="/login" className="underline">Iniciá sesión</Link>
      </p>
    </div>
  );
}
