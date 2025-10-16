import { useEffect, useState } from "react";
import api from "../../lib/api";
import { toast } from 'react-hot-toast';
import type { ReactNode } from "react"; // Necesario para definir Field

type Aviso = {
  id: number;
  titulo: string;
  descripcion?: string;
  fecha?: string;
  estado?: "pendiente" | "completado" | "atrasado";
  creado_en?: string;
  lead?: {
    id: number;
    nombre: string;
    apellido: string;
  };
  propiedad?: {
    id: number;
    titulo: string;
  };
};

export default function AvisosPage() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para el modal de confirmación de eliminación
  const [deletingAviso, setDeletingAviso] = useState<Aviso | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);


  const fetchAvisos = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/api/avisos/");
      const list: unknown = Array.isArray(data) ? data : (data && (data.results ?? data.data));
      const safeArray: Aviso[] = Array.isArray(list) ? list : [];
      setAvisos(safeArray);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Error cargando avisos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvisos();
  }, []);

  const markAsCompleted = async (id: number) => {
    try {
      await api.patch(`/api/avisos/${id}/`, { estado: "completado" });
      toast.success("Aviso marcado como completado");
      fetchAvisos(); // Refrescar la lista
    } catch (e) {
      toast.error("Error al completar el aviso.");
    }
  };

  const confirmDelete = (aviso: Aviso) => {
    setDeletingAviso(aviso);
  };
  
  const handleAvisoDelete = async (id: number) => {
    try {
      await api.delete(`/api/avisos/${id}/`);
      setDeletingAviso(null);
      setResult({ ok: true, msg: "Aviso eliminado correctamente." });
      fetchAvisos(); // Refrescar la lista
    } catch (e) {
      setDeletingAviso(null);
      setResult({ ok: false, msg: "Error al eliminar el aviso." });
    }
  };

  const filtered = q
    ? avisos.filter(a =>
      (a.titulo || "").toLowerCase().includes(q.toLowerCase()) ||
      (a.descripcion || "").toLowerCase().includes(q.toLowerCase()) ||
      (a.lead?.nombre || "").toLowerCase().includes(q.toLowerCase()) ||
      (a.lead?.apellido || "").toLowerCase().includes(q.toLowerCase()) ||
      (a.propiedad?.titulo || "").toLowerCase().includes(q.toLowerCase())
    )
    : avisos;

  const getEstadoClass = (estado?: string) => {
    switch (estado) {
      case "pendiente":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "atrasado":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "completado":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  return (
    <>
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
              <div className="flex items-center justify-between">
                <div className="font-medium text-lg">{a.titulo}</div>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getEstadoClass(a.estado)}`}>
                  {a.estado}
                </span>
              </div>
              {a.descripcion && (
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {a.descripcion}
                </div>
              )}
              <div className="mt-2 text-xs text-gray-500 flex flex-col sm:flex-row sm:items-center sm:gap-3">
                {a.fecha && <span>📅 Fecha: {new Date(a.fecha).toLocaleString()}</span>}
                {a.lead && <span>• Lead: {a.lead.nombre} {a.lead.apellido}</span>}
                {a.propiedad && <span>• Propiedad: {a.propiedad.titulo}</span>}
                {a.creado_en && (
                  <span>• Creado: {new Date(a.creado_en).toLocaleDateString()}</span>
                )}
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                {a.estado !== "completado" && (
                  <button
                    onClick={() => markAsCompleted(a.id)}
                    className="rounded-md px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white"
                  >
                    Completar
                  </button>
                )}
                <button
                  onClick={() => confirmDelete(a)} // Llama a la función de confirmación
                  className="rounded-md px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal de confirmación de eliminación */}
      {deletingAviso && (
        <ConfirmModal
          title="Eliminar Aviso"
          message={`¿Estás seguro de que querés eliminar el aviso "${deletingAviso.titulo}"? Esta acción es irreversible.`}
          confirmLabel="Eliminar"
          confirmType="danger"
          onCancel={() => setDeletingAviso(null)}
          onConfirm={() => handleAvisoDelete(deletingAviso.id)}
        />
      )}
      
      {/* Modal de resultado */}
      {result && <ResultModal ok={result.ok} message={result.msg} onClose={() => setResult(null)} />}
    </>
  );
}

/* --------------------------- Confirm Modal -------------------------- */
type ConfirmModalProps = {
	title: string;
	message: string;
	confirmLabel?: string;
	confirmType?: "primary" | "danger";
	onCancel: () => void;
	onConfirm: () => void | Promise<void>;
};

function ConfirmModal({
	title,
	message,
	confirmLabel = "Confirmar",
	confirmType = "primary",
	onCancel,
	onConfirm,
}: ConfirmModalProps) {
	const [working, setWorking] = useState(false);
	async function go() {
		setWorking(true);
		await onConfirm();
		setWorking(false);
	}
	return (
		<div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
			<div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-6 shadow-xl">
				<div className="text-lg font-semibold mb-2">{title}</div>
				<div className="text-sm text-gray-600 dark:text-gray-300">{message}</div>
				<div className="mt-5 flex items-center justify-end gap-2">
					<button className="h-9 px-3 rounded-lg border text-sm" onClick={onCancel} disabled={working}>
						Cancelar
					</button>
					<button
						className={
							confirmType === "danger"
								? "h-9 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm disabled:opacity-60"
								: "h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60"
						}
						onClick={go}
						disabled={working}
					>
						{working ? "Procesando..." : confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}

/* --------------------------- Result Modal --------------------------- */
function ResultModal({ ok, message, onClose }: { ok: boolean; message: string; onClose: () => void }) {
	return (
		<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={onClose}>
			<div
				className={`w-full max-w-md rounded-2xl border p-5 shadow-lg ${
					ok ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
						: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"}`}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="text-lg font-semibold mb-2">{ok ? "OK" : "Ups"}</div>
				<div className="text-sm">{message}</div>
				<div className="mt-4 text-right">
					<button className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={onClose}>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	);
}
