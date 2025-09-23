import { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // TODO: llamar /api/auth/token (JWT). Por ahora redirige a la app.
    navigate("/app");
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-6">Iniciar sesión</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm">Email</label>
          <input className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700" />
        </div>
        <div>
          <label className="text-sm">Contraseña</label>
          <input type="password" className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700" />
        </div>
        <button className="w-full rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700">Entrar</button>
      </form>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        ¿No tenés cuenta? <Link to="/register" className="underline">Registrate</Link>
      </p>
    </div>
  );
}
