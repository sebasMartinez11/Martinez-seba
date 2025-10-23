// src/pages/Dashboard/TopFilters.tsx
import { useState } from "react";

type Props = {
  onChange: (filters: { date?: string; from?: string; to?: string; types?: string }) => void;
};

export default function TopFilters({ onChange }: Props) {
  const [active, setActive] = useState<"today" | "tomorrow" | "week" | null>(null);
  const [tipo, setTipo] = useState<string>("");

  function handleQuickFilter(key: "today" | "tomorrow" | "week") {
    setActive(key);

    const today = new Date();
    if (key === "today") {
      const d = today.toISOString().slice(0, 10); // YYYY-MM-DD
      onChange({ date: d, types: tipo || undefined });
    } else if (key === "tomorrow") {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const d = tomorrow.toISOString().slice(0, 10);
      onChange({ date: d, types: tipo || undefined });
    } else if (key === "week") {
      const start = new Date(today);
      const end = new Date(today);
      end.setDate(today.getDate() + 7);
      onChange({
        from: start.toISOString().slice(0, 10),
        to: end.toISOString().slice(0, 10),
        types: tipo || undefined,
      });
    }
  }

  function handleTipoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setTipo(val);
    // aplicar filtro actual + tipo
    if (active === "today") {
      const d = new Date().toISOString().slice(0, 10);
      onChange({ date: d, types: val || undefined });
    } else if (active === "tomorrow") {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      const d = t.toISOString().slice(0, 10);
      onChange({ date: d, types: val || undefined });
    } else if (active === "week") {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);
      onChange({
        from: start.toISOString().slice(0, 10),
        to: end.toISOString().slice(0, 10),
        types: val || undefined,
      });
    } else {
      onChange({ types: val || undefined });
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        className={`px-3 h-9 rounded-lg border text-sm ${active === "today" ? "bg-blue-600 rc-text rc-text" : ""}`}
        onClick={() => handleQuickFilter("today")}
      >
        Hoy
      </button>
      <button
        className={`px-3 h-9 rounded-lg border text-sm ${active === "tomorrow" ? "bg-blue-600 rc-text rc-text" : ""}`}
        onClick={() => handleQuickFilter("tomorrow")}
      >
        Mañana
      </button>
      <button
        className={`px-3 h-9 rounded-lg border text-sm ${active === "week" ? "bg-blue-600 rc-text rc-text" : ""}`}
        onClick={() => handleQuickFilter("week")}
      >
        Esta semana
      </button>

      <select
        className="ml-auto h-9 px-3 rounded-lg border text-sm"
        value={tipo}
        onChange={handleTipoChange}
      >
        <option value="">Todos</option>
        <option value="Reunion">Reuniones</option>
        <option value="Llamada">Llamadas</option>
        <option value="Visita">Visitas</option>
      </select>
    </div>
  );
}
