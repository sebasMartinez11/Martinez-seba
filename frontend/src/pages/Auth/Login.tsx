// Importamos hooks de React y utilidades de React Router
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Importamos axios para realizar llamadas HTTP
import axios from "axios";

// Importamos nuestro cliente configurado y la URL base del backend
import { api, API_BASE } from "@/lib/api";

// Tipado del objeto que devuelve el backend al autenticarse
type JwtResponse = { access: string; refresh?: string };

export default function Login() {
  // Hook de navegación para redirigir al usuario al ingresar correctamente
  const navigate = useNavigate();

  // ======== ESTADOS ========
  const [userOrEmail, setUserOrEmail] = useState(""); // guarda lo que escribe el usuario en el campo "email o usuario"
  const [password, setPassword] = useState("");       // guarda la contraseña
  const [loading, setLoading] = useState(false);      // controla si se está enviando el formulario
  const [error, setError] = useState<string | null>(null); // guarda mensajes de error (si los hay)


  // Al cargar el componente, limpiamos posibles datos viejos del login anterior
  useEffect(() => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("rc_user_id");
  }, []);

  // Esta función se ejecuta cuando el usuario hace clic en “Ingresar”
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();       // Evita que el formulario recargue la página
    setError(null);           // Limpia errores previos
    setLoading(true);         // Activa el spinner/bloqueo del botón mientras se procesa

    try {
      //  PEDIMOS TOKEN DE AUTENTICACIÓN AL BACKEND 
      // Endpoint del backend para login (JWT Simple)
      const url = API_BASE + "auth/token/";

      // Llamada con axios enviando username/email y password
      const res = await axios.post<JwtResponse>(
        url,
        { username: userOrEmail.trim(), password },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      // Si llegamos acá, el backend devolvió status 200 → éxito
      const { access, refresh } = res.data;

      // Si por alguna razón no viene el access token, lanzamos error
      if (!access) throw new Error("No llegó el access token");

      // Guardamos los tokens en localStorage
      localStorage.setItem("rc_token", access);
      if (refresh) localStorage.setItem("refresh", refresh);

      // Si el usuario no tiene tema guardado, dejamos por defecto “dark”
      if (!localStorage.getItem("rc_theme")) localStorage.setItem("rc_theme", "dark");

      //  PEDIMOS LOS DATOS DEL USUARIO LOGUEADO 
      // Usamos el cliente api (con Bearer token configurado)
      const me = await api.get<{ id: number }>("usuarios/me/");

      // Guardamos el ID del usuario logueado
      localStorage.setItem("rc_user_id", String(me.data.id));

      // REDIRECCIONAMOS AL DASHBOARD 
      navigate("/app", { replace: true });

    } catch (err: any) {
      //BLOQUE DE ERRORES 
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error("LOGIN ERROR", status, data ?? err);

      // Mensaje base
      let msg = "Correo o contraseña incorrectos.";

      // Intentamos extraer el mensaje exacto del backend (si viene)
      const detail = data?.detail || data?.message || (typeof data === "string" ? data : "");

      // Si el mensaje es el de SimpleJWT (en inglés), lo traducimos
      if (/No active account found with the given credentials\.?/.test(detail || "")) {
        msg = "Correo o contraseña incorrectos.";
      } else if (detail) {
        msg = detail;
      } else if (status && status !== 401) {
        msg = `Error ${status}: no se pudo iniciar sesión.`;
      }

      // Guardamos el mensaje en el estado para mostrarlo en pantalla
      setError(msg);
    } finally {
      // Terminamos el ciclo → quitamos el “loading”
      setLoading(false);
    }
  }

  //  RENDER
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-app">
      {/* Fondo decorativo (solo aparece en modo oscuro) */}
      <div className="pointer-events-none absolute inset-0 -z-10 hidden dark:block">
        {/* Gradiente suave vertical */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1220] via-[#0a0f1a] to-[#0b1220]" />
        {/* Patrón de puntos */}
        <div
          className="absolute inset-0 opacity-[0.08]
                     [background-image:radial-gradient(#ffffff_1px,transparent_1px)]
                     [background-size:22px_22px]"
        />
      </div>

      {/* Contenedor principal centrado */}
      <div className="grid min-h-[100svh] place-items-center px-4 py-10">
        {/* FORMULARIO DE LOGIN */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-2xl border rc-border bg-surface shadow-elev-1 p-6 md:p-7 auth-card"
        >
          {/* Título y subtítulo */}
          <h1 className="text-xl font-semibold mb-1 title">Iniciar sesión</h1>
          <p className="text-sm mb-4 hint">Entrá con tu usuario para continuar.</p>

          {/* Mensaje de error (si existe) */}
          {error && (
            <div className="mb-4 text-sm rounded-md border border-rose-300/60 dark:border-rose-700/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 p-3 whitespace-pre-wrap">
              {error}
            </div>
          )}

          {/* Campo: Email o usuario */}
          <div className="space-y-1">
            <label className="text-xs rc-muted">Email o usuario</label>
            <input
              type="text"
              required
              value={userOrEmail}
              onChange={(e) => setUserOrEmail(e.target.value)}
              className="rc-input w-full"
              placeholder="tucorreo@mail.com o usuario"
              autoComplete="username"
            />
          </div>

          {/* Campo: Contraseña */}
          <div className="space-y-1 mt-4">
            <label className="text-xs rc-muted">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rc-input w-full"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {/* Botón de envío */}
          <button
            disabled={loading}
            className="mt-5 w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 rc-text text-sm font-medium shadow-lg shadow-blue-900/20 disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
