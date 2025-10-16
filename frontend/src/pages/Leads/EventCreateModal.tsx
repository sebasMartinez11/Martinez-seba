import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import axios from "axios";
import Modal from "@/components/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void; // callback para refrescar listas si querés
};

type PropiedadOption = { id: number; titulo?: string };

function toArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.results)) return data.results as T[];
  return [];
}

// Función para obtener la fecha y hora actual en el formato requerido
function getTodayMin() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EventCreateModal({ open, onClose, onCreated }: Props) {
  const [propsOpts, setPropsOpts] = useState<PropiedadOption[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [propiedadId, setPropiedadId] = useState<number | "">("");
  const [fechaHora, setFechaHora] = useState("");
  const [tipo, setTipo] = useState<"Reunion" | "Visita" | "Llamada" | "">("");

  useEffect(() => {
    if (!open) return;
    setLoadingProps(true);
    axios
      .get("/api/propiedades/")
      .then((res) => setPropsOpts(toArray<PropiedadOption>(res.data)))
      .catch(() => setPropsOpts([]))
      .finally(() => setLoadingProps(false));
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!propiedadId || !fechaHora || !tipo) return;

    setSubmitting(true);
    try {
      // ⚠️ Ajustá los nombres de campos a tu serializer de Eventos
      // Ejemplo esperado por backend:
      // { nombre, apellido, email, propiedad: propiedadId, fecha_hora: ISO, tipo }
      await axios.post("/api/eventos/", {
        nombre,
        apellido,
        email,
        propiedad: propiedadId,
        fecha_hora: new Date(fechaHora).toISOString(),
        tipo, // "Reunion" | "Visita" | "Llamada"
      });
      onCreated?.();
      onClose();
      // reset
      setNombre("");
      setApellido("");
      setEmail("");
      setPropiedadId("");
      setFechaHora("");
      setTipo("");
    } catch (err) {
      alert("No se pudo crear el evento. Revisá el mapeo de campos del backend.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar evento" maxWidth="sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Nombre</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm">Apellido</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm">Email</label>
          <input
            type="email"
            className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Propiedad</label>
          <select
            className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
            value={propiedadId}
            onChange={(e) => setPropiedadId(Number(e.target.value))}
            disabled={loadingProps}
          >
            <option value="">
              {loadingProps ? "Cargando..." : "Seleccioná una propiedad"}
            </option>
            {propsOpts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titulo ? `${p.titulo} (#${p.id})` : `Propiedad #${p.id}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm">Fecha y hora</label>
          <input
            type="datetime-local"
            className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
            value={fechaHora}
            onChange={(e) => setFechaHora(e.target.value)}
            min={getTodayMin()}
          />
        </div>

        <div>
          <label className="text-sm">Tipo de evento</label>
          <select
            className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as any)}
          >
            <option value="">Seleccioná tipo</option>
            <option value="Reunion">Reunión</option>
            <option value="Visita">Visita</option>
            <option value="Llamada">Llamada</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-sm border-gray-300 dark:border-gray-700"
          >
            Cancelar
          </button>
          <button
            disabled={submitting || !propiedadId || !fechaHora || !tipo}
            className="rounded-md px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Guardando..." : "Registrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}