// src/pages/Propiedades/PropiedadCreateModal.tsx
import type { FormEvent } from "react";
import { useRef, useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import Modal from "@/components/Modal";
import SmartLocationCombo from "@/components/SmartLocationCombo";

type Props = { open: boolean; onClose: () => void; onCreated?: () => void };

type Estado = "disponible" | "vendido" | "reservado";
type TipoProp = "casa" | "departamento" | "hotel";
type Moneda = "USD" | "ARS";
type Disponibilidad = "venta" | "alquiler";

export default function PropiedadCreateModal({ open, onClose, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // === Form state (mapeado 1:1 al backend) ===
  const [codigo, setCodigo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [tipoDePropiedad, setTipoDePropiedad] = useState<TipoProp>("casa");
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | "">(""); // SELECT requerido
  const [precio, setPrecio] = useState<number | "">("");
  const [moneda, setMoneda] = useState<Moneda>("USD");
  const [ambiente, setAmbiente] = useState<number | "">("");
  const [antiguedad, setAntiguedad] = useState<number | "">("");
  const [banos, setBanos] = useState<number | "">("");
  const [superficie, setSuperficie] = useState<number | "">("");
  const [estado, setEstado] = useState<Estado>("disponible");

  // Imagen (opcional – se sube luego de crear la propiedad)
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setServerError(null);
  }, [open]);

  function onChangeFile() {
    const f = fileRef.current?.files?.[0];
    if (!f) { setPreview(null); return; }
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  async function uploadImagen(propId: number) {
    const f = fileRef.current?.files?.[0];
    if (!f) return;

    const fd = new FormData();
    fd.append("imagen", f);
    await axios.post(`/api/propiedades/${propId}/subir-imagenes/`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setServerError(null);

    try {
      const payload = {
        codigo,
        titulo,
        descripcion,
        ubicacion,
        tipo_de_propiedad: tipoDePropiedad,
        disponibilidad: disponibilidad || "",
        precio: precio === "" ? 0 : Number(precio),
        moneda,
        ambiente: ambiente === "" ? 0 : Number(ambiente),
        antiguedad: antiguedad === "" ? 0 : Number(antiguedad),
        banos: banos === "" ? 0 : Number(banos),
        superficie: superficie === "" ? 0 : Number(superficie),
        estado,
      };

      const res = await axios.post("/api/propiedades/", payload);
      const newId: number = res.data?.id;

      try { await uploadImagen(newId); } catch (e) {
        console.warn("Propiedad creada, pero falló la subida de imagen", e);
      }

      onCreated?.();
      onClose();

      // Reset
      setCodigo(""); setTitulo(""); setDescripcion(""); setUbicacion("");
      setTipoDePropiedad("casa"); setDisponibilidad("");
      setPrecio(""); setMoneda("USD"); setAmbiente(""); setAntiguedad("");
      setBanos(""); setSuperficie(""); setEstado("disponible");
      setPreview(null); if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      const e = err as AxiosError<any>;
      if (e.response) {
        const status = e.response.status;
        const data = e.response.data;
        console.error("Error crear propiedad:", status, data);

        if (status === 401) {
          setServerError("Necesitás iniciar sesión para crear propiedades.");
        } else if (status === 400 && data) {
          const firstKey = Object.keys(data)[0];
          const firstVal = Array.isArray(data[firstKey]) ? data[firstKey][0] : JSON.stringify(data[firstKey]);
          setServerError(`${firstKey}: ${firstVal}`);
        } else {
          setServerError("Error inesperado del servidor.");
        }
      } else {
        setServerError("No hay conexión con el servidor.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar propiedad" maxWidth="lg">
      {/* contenedor con altura contenida (sin ocupar pantalla completa) */}
      <div className="max-h-[80vh] overflow-y-auto pr-1">
        <form onSubmit={onSubmit} className="space-y-4">
          {serverError && (
            <div className="rounded-md border px-3 py-2 text-sm border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {serverError}
            </div>
          )}

          {/* Header compacto en 2 columnas */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Columna izquierda (form) */}
            <div className="md:col-span-8 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Código *</label>
                  <input
                    required
                    className="mt-1 w-full border rounded-md px-3 h-10 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm">Título *</label>
                  <input
                    required
                    className="mt-1 w-full border rounded-md px-3 h-10 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm">Ubicación *</label>
                <SmartLocationCombo
                  value={ubicacion}
                  onChange={(v) => setUbicacion(v)}
                  required
                  minChars={2}
                  limit={10}
                  showOnEmpty={false}
                />
              </div>

              <div>
                <label className="text-sm">Descripción</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Tipo de propiedad *</label>
                  <select
                    className="mt-1 w-full border rounded-md px-3 h-10 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                    value={tipoDePropiedad}
                    onChange={(e) => setTipoDePropiedad(e.target.value as any)}
                  >
                    <option value="casa">Casa</option>
                    <option value="departamento">Departamento</option>
                    <option value="hotel">Hotel</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm">Disponibilidad *</label>
                  <select
                    required
                    className="mt-1 w-full border rounded-md px-3 h-10 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                    value={disponibilidad}
                    onChange={(e) => setDisponibilidad(e.target.value as Disponibilidad)}
                  >
                    <option value="">— Seleccionar —</option>
                    <option value="venta">Venta</option>
                    <option value="alquiler">Alquiler</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Precio *</label>
                  <input
                    required
                    type="number"
                    min={0}
                    className="mt-1 w-full border rounded-md px-3 h-10 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-sm">Moneda *</label>
                  <select
                    className="mt-1 w-full border rounded-md px-3 h-10 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value as any)}
                  >
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-sm">Ambiente</label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full border rounded-md px-3 h-10 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                    value={ambiente}
                    onChange={(e) => setAmbiente(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-sm">Baños</label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full border rounded-md px-3 h-10 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                    value={banos}
                    onChange={(e) => setBanos(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-sm">Antigüedad</label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full border rounded-md px-3 h-10 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                    value={antiguedad}
                    onChange={(e) => setAntiguedad(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-sm">Superficie (m²)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 w-full border rounded-md px-3 h-10 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                    value={superficie}
                    onChange={(e) => setSuperficie(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm">Estado *</label>
                <select
                  className="mt-1 w-full border rounded-md px-3 h-10 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as any)}
                >
                  <option value="disponible">Disponible</option>
                  <option value="vendido">Vendido</option>
                  <option value="reservado">Reservado</option>
                </select>
              </div>
            </div>

            {/* Columna derecha (imagen) */}
            <div className="md:col-span-4 space-y-2">
              <label className="text-sm">Imagen (opcional)</label>
              <div className="rounded-xl border border-dashed h-40 flex items-center justify-center text-sm dark:border-gray-700 overflow-hidden">
                {preview ? (
                  <img src={preview} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-gray-500 px-4 text-center">
                    Seleccioná una imagen para subir al crear.
                  </span>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onChangeFile}
                className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-200"
              />
              <p className="text-xs text-gray-500">
                La imagen se sube <strong>después</strong> de crear la propiedad, vía endpoint de imágenes.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-t border-gray-200 dark:border-gray-800 pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm border-gray-300 dark:border-gray-700"
            >
              Cancelar
            </button>
            <button
              disabled={submitting || !codigo || !titulo || !ubicacion || precio === "" || !disponibilidad}
              className="rounded-md px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
