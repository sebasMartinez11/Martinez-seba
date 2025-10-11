import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api, API_BASE } from "@/lib/api";

type JwtResponse = { access: string; refresh?: string };

export default function Login() {
  const navigate = useNavigate();
  const [userOrEmail, setUserOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // limpiar restos para que no “ensucien” el flujo
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("rc_user_id");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // ===== 1) TOKEN (llamada directa, fuera del api con interceptores) =====
      const url = API_BASE + "auth/token/"; // p.ej. http://127.0.0.1:8000/api/auth/token/
      const res = await axios.post<JwtResponse>(
        url,
        { username: userOrEmail.trim(), password },
        { headers: { "Content-Type": "application/json", Accept: "application/json" } }
      );

      // si llegamos acá, es 200
      const { access, refresh } = res.data;
      if (!access) throw new Error("No llegó el access token");

      localStorage.setItem("access", access);
      if (refresh) localStorage.setItem("refresh", refresh);
      if (!localStorage.getItem("rc_theme")) localStorage.setItem("rc_theme", "dark");

      // ===== 2) ME (ahora sí con api, ya que el interceptor pondrá el Bearer) =====
      const me = await api.get<{ id: number }>("usuarios/me/");
      localStorage.setItem("rc_user_id", String(me.data.id));

      // listo
      navigate("/app", { replace: true });
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error("LOGIN ERROR", status, data ?? err);

      // Mensaje por defecto en español
      let msg = "Correo o contraseña incorrectos.";

      // Si el backend envía detalle, lo normalizamos
      const detail = data?.detail || data?.message || (typeof data === "string" ? data : "");

      // Si viene el mensaje de SimpleJWT en inglés, lo traducimos
      if (/No active account found with the given credentials\.?/.test(detail || "")) {
        msg = "Correo o contraseña incorrectos.";
      } else if (detail) {
        // Para otros errores específicos del backend
        msg = detail;
      } else if (status && status !== 401) {
        // Errores no-auth (timeout, 5xx, etc.)
        msg = `Error ${status}: no se pudo iniciar sesión.`;
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  } 

  return (
    <main className="relative min-h-[100svh] overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#0b1220]" />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]
                   [background-image:radial-gradient(#ffffff_1px,transparent_1px)]
                   [background-size:22px_22px]"
      />
      <div className="grid min-h-[100svh] place-items-center px-4 py-10">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-white/10 backdrop-blur
                     shadow-2xl p-6 md:p-7 text-gray-100"
        >
          <h1 className="text-xl font-semibold mb-4">Iniciar sesión</h1>

          {error && (
            <div className="mb-4 text-sm rounded-md border border-red-400/40 bg-red-500/10 text-red-200 p-3 whitespace-pre-wrap">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm text-gray-300">Email o usuario</label>
            <input
              type="text"
              required
              value={userOrEmail}
              onChange={(e) => setUserOrEmail(e.target.value)}
              className="w-full h-10 rounded-lg border border-white/15 bg-white/5
                         px-3 text-sm outline-none focus:ring-2 focus:ring-blue-400/50"
              placeholder="tu@mail.com o username"
              autoComplete="username"
            />
          </div>

          <div className="space-y-1 mt-4">
            <label className="text-sm text-gray-300">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 rounded-lg border border-white/15 bg-white/5
                         px-3 text-sm outline-none focus:ring-2 focus:ring-blue-400/50"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            disabled={loading}
            className="mt-5 w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60
                       rc-text rc-text text-sm font-medium shadow-lg shadow-blue-900/30"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
