import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api"; // ← tu cliente axios con interceptors

// =============================================
// Helpers
// =============================================
function fmt(n: number) {
  return n.toString().padStart(2, "0");
}

function thisYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// =============================================
// Types (ligeros para este módulo)
// =============================================
type Metrics = {
  year: number;
  month: number;
  leads_mes: number;
  ventas_mes: number;
  conversion_pct: number;
};

type ImportResult = {
  resource: string;
  dry_run: boolean;
  created: number;
  updated: number;
  errors: Array<{ row: number; error: string }>;
};

type MeResponse = {
  id: number;
  nombre?: string;
  apellido?: string;
  email: string;
  telefono?: string;
  dni?: string;
  reminder_every_days?: number;
};

// =============================================
// UI Primitivos
// =============================================
function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 ${className}`}
    >
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
    </label>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const base = "h-10 px-4 rounded-xl text-sm font-medium transition border";
  const style =
    variant === "primary"
      ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
      : variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
      : "bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${style} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

// forwardRef para permitir ref en <Input /> y <Select />
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => (
  <input
    ref={ref}
    {...props}
    className={`h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm ${
      props.className || ""
    }`}
  />
));
Input.displayName = "Input";

const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>((props, ref) => (
  <select
    ref={ref}
    {...props}
    className={`h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 text-sm ${
      props.className || ""
    }`}
  />
));
Select.displayName = "Select";

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm ${
        props.className || ""
      }`}
    />
  );
}

function Alert({
  kind = "info",
  children,
}: {
  kind?: "info" | "error" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800",
    error:
      "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800",
    success:
      "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800",
  } as const;
  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${styles[kind]}`}>
      {children}
    </div>
  );
}

// =============================================
// Error Boundary para evitar pantalla blanca
// =============================================
class Boundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; msg?: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, msg: String(err?.message || err) };
  }
  componentDidCatch(err: any, info: any) {
    console.error("UI crash:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto mt-10">
          <div className="rounded-xl border border-red-300 bg-red-50 text-red-800 p-4">
            <b>Ocurrió un error en la UI</b>
            <div className="text-sm mt-1">{this.state.msg}</div>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

// =============================================
// Exportar + Métricas + Importar + Cuenta + Preferencias
// =============================================
export default function ConfiguracionPage() {
  const now = thisYearMonth();
  const [year, setYear] = useState<number>(now.year);
  const [month, setMonth] = useState<number>(now.month);
  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => y - 3 + i);
  }, []);

  // Export
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [resLeads, setResLeads] = useState(true);
  const [resProps, setResProps] = useState(true);
  const [resEventos, setResEventos] = useState(false);
  const [estadoProp, setEstadoProp] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Import
  const [importRes, setImportRes] = useState<ImportResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResource, setImportResource] =
    useState<"leads" | "propiedades" | "eventos">("propiedades");
  const [dryRun, setDryRun] = useState(true);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Password change
  const [pwdCur, setPwdCur] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdNew2, setPwdNew2] = useState("");
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Delete account
  const [confirmText, setConfirmText] = useState("");
  const [delPwd, setDelPwd] = useState("");
  const [delMsg, setDelMsg] = useState<string | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  // Preferencias (recordatorios)
  const [reminderDays, setReminderDays] = useState<number>(3);
  const [prefLoading, setPrefLoading] = useState<boolean>(false);
  const [prefSaving, setPrefSaving] = useState<boolean>(false);
  const [prefMsg, setPrefMsg] = useState<string | null>(null);
  const [prefErr, setPrefErr] = useState<string | null>(null);

  // Cargar preferencia actual
  useEffect(() => {
    let mounted = true;
    async function loadMe() {
      setPrefLoading(true);
      setPrefErr(null);
      try {
        const { data } = await api.get<MeResponse>("/api/usuarios/me/");
        if (!mounted) return;
        const v = data?.reminder_every_days;
        if (typeof v === "number" && v > 0) setReminderDays(v);
      } catch (e: any) {
        if (!mounted) return;
        setPrefErr(e?.response?.data?.detail || e?.message || "No se pudo cargar tu preferencia.");
      } finally {
        if (mounted) setPrefLoading(false);
      }
    }
    loadMe();
    return () => {
      mounted = false;
    };
  }, []);

  async function savePrefs() {
    setPrefSaving(true);
    setPrefMsg(null);
    setPrefErr(null);
    try {
      const value = Number(reminderDays);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Ingresá un número válido (p. ej. 3, 5 o 7).");
      await api.patch("/api/usuarios/me/", { reminder_every_days: value });
      setPrefMsg("Preferencia guardada ✅");
    } catch (e: any) {
      setPrefErr(e?.response?.data?.detail || e?.message || "No se pudo guardar la preferencia.");
    } finally {
      setPrefSaving(false);
    }
  }

  // ================= Export =================
  async function handleExport() {
    setExportLoading(true);
    setExportError(null);
    try {
      const resources = [
        resLeads && "leads",
        resProps && "propiedades",
        resEventos && "eventos",
      ].filter(Boolean);
      if (resources.length === 0)
        throw new Error("Seleccioná al menos un recurso");

      const payload = {
        format,
        resources,
        filters: {
          year,
          month,
          estado_propiedad: estadoProp.length ? estadoProp : undefined,
        },
      };

      const url = "/api/exportacion/export/";
      if (format === "csv") {
        const { data } = await api.post(url, payload, { responseType: "blob" });
        const fname = `export_${year}_${fmt(month)}.csv`;
        downloadBlob(data, fname);
      } else {
        const { data } = await api.post(url, payload, {
          responseType: "json",
        });
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const fname = `export_${year}_${fmt(month)}.json`;
        downloadBlob(blob, fname);
      }
    } catch (e: any) {
      setExportError(
        e?.response?.data?.detail || e?.message || "Error exportando"
      );
    } finally {
      setExportLoading(false);
    }
  }

  async function handleMetrics() {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const { data } = await api.get<Metrics>(`/api/exportacion/metrics/`, {
        params: { year, month },
      });
      setMetrics(data);
    } catch (e: any) {
      setMetricsError(
        e?.response?.data?.detail || e?.message || "Error obteniendo métricas"
      );
    } finally {
      setMetricsLoading(false);
    }
  }

  // ================= Import =================
  async function handleImport() {
    setImportLoading(true);
    setImportError(null);
    setImportRes(null);
    try {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Seleccioná un archivo CSV o JSON");
      const form = new FormData();
      form.append("file", file);
      form.append("resource", importResource);
      form.append("dry_run", String(dryRun));
      const { data } = await api.post<ImportResult>(
        "/api/exportacion/import/",
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setImportRes(data);
    } catch (e: any) {
      setImportError(
        e?.response?.data?.detail || e?.message || "Error importando"
      );
    } finally {
      setImportLoading(false);
    }
  }

  // ================= Password change =================
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    setPwdLoading(true);
    try {
      if (pwdNew !== pwdNew2)
        throw new Error("Las contraseñas nuevas no coinciden");
      await api.post("/api/usuarios/me/change_password/", {
        current_password: pwdCur,
        new_password: pwdNew,
        re_new_password: pwdNew2,
      });
      setPwdMsg("Contraseña actualizada ✅");
      setPwdCur("");
      setPwdNew("");
      setPwdNew2("");
    } catch (e: any) {
      setPwdMsg(
        e?.response?.data?.detail ||
          e?.message ||
          "Error actualizando contraseña"
      );
    } finally {
      setPwdLoading(false);
    }
  }

  // ================= Delete account =================
  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDelMsg(null);
    setDelLoading(true);
    try {
      await api.post("/api/usuarios/me/delete/", {
        current_password: delPwd,
        confirm_text: confirmText,
      });
      setDelMsg("Cuenta eliminada. Cerrando sesión...");
      localStorage.clear();
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (e: any) {
      setDelMsg(
        e?.response?.data?.detail || e?.message || "No se pudo eliminar la cuenta"
      );
    } finally {
      setDelLoading(false);
    }
  }

  return (
    <Boundary>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold mb-2">Configuración</h1>

        {/* Preferencias de recordatorios */}
        <Section title="Preferencias de recordatorios">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <Label>Recordarme cada (días)</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={reminderDays}
                onChange={(e) => setReminderDays(Number(e.target.value))}
              />
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Recomendado: <b>3</b>, <b>5</b> o <b>7</b> días.
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={savePrefs} disabled={prefSaving || prefLoading}>
                {prefSaving ? "Guardando…" : "Guardar preferencia"}
              </Button>
              {prefLoading && (
                <span className="text-sm text-gray-500 dark:text-gray-400">Cargando…</span>
              )}
            </div>
          </div>
          {prefMsg && (
            <div className="mt-3">
              <Alert kind="success">{prefMsg}</Alert>
            </div>
          )}
          {prefErr && (
            <div className="mt-3">
              <Alert kind="error">{prefErr}</Alert>
            </div>
          )}
        </Section>

        {/* Exportar datos */}
        <Section title="Exportar datos (CSV/JSON)">
          <Row>
            <div className="space-y-2">
              <Label>Periodo</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                >
                  {useMemo(() => {
                    const y = new Date().getFullYear();
                    return Array.from({ length: 7 }, (_, i) => y - 3 + i);
                  }, []).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
                <Select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {fmt(m)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Formato</Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="fmt"
                    checked={format === "csv"}
                    onChange={() => setFormat("csv")}
                  />
                  CSV
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="fmt"
                    checked={format === "json"}
                    onChange={() => setFormat("json")}
                  />
                  JSON
                </label>
              </div>
            </div>
          </Row>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
              <Label>Recursos</Label>
              <div className="mt-2 space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={resLeads}
                    onChange={(e) => setResLeads(e.target.checked)}
                  />
                  Leads
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={resProps}
                    onChange={(e) => setResProps(e.target.checked)}
                  />
                  Propiedades
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={resEventos}
                    onChange={(e) => setResEventos(e.target.checked)}
                  />
                  Eventos
                </label>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
              <Label>Estado de propiedad (opcional)</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {["disponible", "vendido", "reservado"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={estadoProp.includes(opt)}
                      onChange={(e) => {
                        setEstadoProp((prev) =>
                          e.target.checked
                            ? [...prev, opt]
                            : prev.filter((x) => x !== opt)
                        );
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleExport} disabled={exportLoading}>
                {exportLoading ? "Exportando…" : "Exportar"}
              </Button>
              <Button
                variant="ghost"
                onClick={handleMetrics}
                disabled={metricsLoading}
              >
                {metricsLoading ? "Cargando…" : "Ver métricas"}
              </Button>
            </div>
          </div>

          {exportError && (
            <div className="mt-3">
              <Alert kind="error">{exportError}</Alert>
            </div>
          )}
          {metrics && (
            <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-sm">
              <div className="font-medium mb-2">
                Métricas {metrics.year}-{fmt(metrics.month)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-3">
                  Leads del mes: <b>{metrics.leads_mes}</b>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-3">
                  Ventas del mes: <b>{metrics.ventas_mes}</b>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-3">
                  % Conversión: <b>{metrics.conversion_pct}%</b>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* Importar */}
        <Section title="Importar datos (CSV/JSON)">
          <Row>
            <div className="space-y-2">
              <Label>Recurso</Label>
              <Select
                value={importResource}
                onChange={(e) =>
                  setImportResource(e.target.value as any)
                }
              >
                <option value="leads">Leads</option>
                <option value="propiedades">Propiedades</option>
                <option value="eventos">Eventos</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Archivo</Label>
              <Input ref={fileRef} type="file" accept=".csv, .json" />
            </div>
          </Row>
          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              Dry-run (preview sin guardar)
            </label>
            <Button onClick={handleImport} disabled={importLoading}>
              {importLoading ? "Procesando…" : "Procesar"}
            </Button>
          </div>
          {importError && (
            <div className="mt-3">
              <Alert kind="error">{importError}</Alert>
            </div>
          )}
          {importRes && (
            <div className="mt-4 space-y-2 text-sm">
              <Alert kind={importRes.errors.length ? "info" : "success"}>
                <div className="font-medium mb-1">
                  Resultado ({importRes.dry_run ? "preview" : "aplicado"})
                </div>
                <div>
                  Creado: <b>{importRes.created}</b> · Actualizado:{" "}
                  <b>{importRes.updated}</b> · Errores:{" "}
                  <b>{importRes.errors.length}</b>
                </div>
              </Alert>
              {importRes.errors.length > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="py-1 pr-3">Fila</th>
                        <th className="py-1">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRes.errors.slice(0, 200).map((e, i) => (
                        <tr
                          key={i}
                          className="border-t border-gray-100 dark:border-gray-800"
                        >
                          <td className="py-1 pr-3">{e.row}</td>
                          <td className="py-1">{e.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Seguridad de la cuenta */}
        <Section title="Seguridad: cambiar contraseña">
          <form
            onSubmit={handleChangePassword}
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            <div>
              <Label>Contraseña actual</Label>
              <Input
                type="password"
                value={pwdCur}
                onChange={(e) => setPwdCur(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Nueva contraseña</Label>
              <Input
                type="password"
                value={pwdNew}
                onChange={(e) => setPwdNew(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Repetir nueva contraseña</Label>
              <Input
                type="password"
                value={pwdNew2}
                onChange={(e) => setPwdNew2(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-3 flex items-center gap-2">
              <Button type="submit" disabled={pwdLoading}>
                {pwdLoading ? "Guardando…" : "Actualizar contraseña"}
              </Button>
              {pwdMsg && (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {pwdMsg}
                </span>
              )}
            </div>
          </form>
        </Section>

        <Section title="Eliminar cuenta (acción irreversible)">
          <form
            onSubmit={handleDeleteAccount}
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            <div>
              <Label>
                Escribí{" "}
                <code className="px-1 rounded bg-gray-100 dark:bg-gray-900">
                  ELIMINAR
                </code>{" "}
                para confirmar
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="ELIMINAR"
              />
            </div>
            <div>
              <Label>Tu contraseña actual</Label>
              <Input
                type="password"
                value={delPwd}
                onChange={(e) => setDelPwd(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                variant="danger"
                disabled={delLoading || confirmText !== "ELIMINAR"}
              >
                {delLoading ? "Eliminando…" : "Eliminar cuenta"}
              </Button>
            </div>
            {delMsg && (
              <div className="md:col-span-3">
                <Alert kind={delMsg.includes("eliminada") ? "success" : "error"}>
                  {delMsg}
                </Alert>
              </div>
            )}
          </form>
        </Section>
      </div>
    </Boundary>
  );
}
