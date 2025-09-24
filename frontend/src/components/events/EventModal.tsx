import { useEffect, useState } from "react";
import axios from "axios";

type Propiedad = { id: number; titulo: string };

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

const TIPO_LABELS = ["Reunion", "Visita", "Llamada"] as const;
type TipoUI = (typeof TIPO_LABELS)[number];

// <- CAMBIO CLAVE: ahora mandamos el mismo label que espera el backend (con mayúscula)
const TIPO_BACKEND: Record<TipoUI, "Reunion" | "Visita" | "Llamada"> = {
  Reunion: "Reunion",
  Visita: "Visita",
  Llamada: "Llamada",
};

export default function EventModal({ onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [propsList, setPropsList] = useState<Propiedad[]>([]);

  // form state
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [propiedadId, setPropiedadId] = useState<number | undefined>(undefined);
  const [fecha, setFecha] = useState<string>(""); // YYYY-MM-DD
  const [hora, setHora] = useState<string>(""); // HH:mm
  const [tipoUI, setTipoUI] = useState<TipoUI>("Visita");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get("/api/propiedades/");
        const arr = Array.isArray(r.data) ? r.data : r.data?.results ?? [];
        setPropsList(arr);
      } catch (e) {
        console.error("No pude cargar propiedades", e);
      }
    })();
  }, []);

  function buildISOFromLocal(dateStr: string, timeStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0);
    return dt.toISOString();
  }

  async function handleSave() {
    if (!propiedadId || !fecha || !hora) {
      alert("Elegí propiedad, fecha y hora.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nombre: nombre || undefined,
        apellido: apellido || undefined,
        email: email || undefined,
        propiedad: propiedadId, // ID numérico
        tipo: TIPO_BACKEND[tipoUI], // <- ahora coincide con los choices del backend
        fecha_hora: buildISOFromLocal(fecha, hora),
        notas: notas || undefined,
      };

      await axios.post("/api/eventos/", payload, {
        headers: { "Content-Type": "application/json" },
      });

      onCreated();
    } catch (e: any) {
      const detail =
        e?.response?.data
          ? JSON.stringify(e.response.data)
          : "Revisá el mapeo de campos del backend.";
      alert(`No se pudo crear el evento.\n${detail}`);
      console.error("POST /api/eventos/ error", e?.response ?? e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold mb-4">Nuevo evento</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Nombre</label>
            <input className="mt-1 w-full rounded-md bg-gray-100/60 dark:bg-gray-800 px-3 h-10"
              value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-500">Apellido</label>
            <input className="mt-1 w-full rounded-md bg-gray-100/60 dark:bg-gray-800 px-3 h-10"
              value={apellido} onChange={(e) => setApellido(e.target.value)} />
          </div>

          <div>
            <label className="text-sm text-gray-500">Email</label>
            <input type="email" className="mt-1 w-full rounded-md bg-gray-100/60 dark:bg-gray-800 px-3 h-10"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-500">Propiedad</label>
            <select
              className="mt-1 w-full rounded-md bg-gray-100/60 dark:bg-gray-800 px-3 h-10"
              value={propiedadId ?? ""}
              onChange={(e) => setPropiedadId(Number(e.target.value) || undefined)}
            >
              <option value="">— Seleccionar —</option>
              {propsList.map((p) => (
                <option key={p.id} value={p.id}>{p.titulo} (#{p.id})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-500">Fecha</label>
            <input type="date"
              className="mt-1 w-full rounded-md bg-gray-100/60 dark:bg-gray-800 px-3 h-10"
              value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-500">Hora</label>
            <input type="time"
              className="mt-1 w-full rounded-md bg-gray-100/60 dark:bg-gray-800 px-3 h-10"
              value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>

          <div>
            <label className="text-sm text-gray-500">Tipo de evento</label>
            <select
              className="mt-1 w-full rounded-md bg-gray-100/60 dark:bg-gray-800 px-3 h-10"
              value={tipoUI}
              onChange={(e) => setTipoUI(e.target.value as TipoUI)}
            >
              {TIPO_LABELS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-gray-500">Notas</label>
            <textarea
              className="mt-1 w-full rounded-md bg-gray-100/60 dark:bg-gray-800 px-3 py-2 min-h-[72px]"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="h-10 px-4 rounded-md border border-gray-300 dark:border-gray-700"
                  onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="h-10 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                  onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
