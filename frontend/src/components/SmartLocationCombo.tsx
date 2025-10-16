// src/components/SmartLocationCombo.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import data from "@/data/arg-geo.json";

type Option = {
  prov_id: string; // "14"
  prov: string;    // "Córdoba"
  depto_id: string; // "14049"
  depto: string;    // "Marcos Juárez"
  label: string;    // "Córdoba, Marcos Juárez"
  tokens: string;   // normalizado para búsqueda
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function buildOptions(): Option[] {
  const out: Option[] = [];
  for (const p of data.provinces) {
    for (const d of p.departments) {
      const label = `${p.name}, ${d.name}`;
      out.push({
        prov_id: String(p.id),
        prov: p.name,
        depto_id: String(d.id),
        depto: d.name,
        label,
        tokens: norm(`${p.name} ${d.name} ${label}`),
      });
    }
  }
  return out;
}

const ALL_OPTIONS: Option[] = buildOptions();

type Props = {
  value: string;
  onChange: (v: string, meta?: { prov_id?: string; depto_id?: string }) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;

  /** No mostrar resultados hasta que se escriban al menos N letras (default: 2) */
  minChars?: number;
  /** Límite de resultados (evita scroll) (default: 12) */
  limit?: number;
  /** Si true, muestra resultados aun sin escribir (default: false) */
  showOnEmpty?: boolean;
};

export default function SmartLocationCombo({
  value,
  onChange,
  placeholder = "Provincia, Departamento",
  required = false,
  className = "",
  minChars = 2,
  limit = 12,
  showOnEmpty = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || "");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => setQ(value || ""), [value]);

  // debounce liviano
  const [raw, setRaw] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setRaw(q), 80);
    return () => clearTimeout(id);
  }, [q]);

  const canOpen = useMemo(() => {
    const len = norm(raw).length;
    return showOnEmpty || len >= minChars;
  }, [raw, minChars, showOnEmpty]);

  const results = useMemo(() => {
    const nq = norm(raw);
    if (!canOpen) return [];
    if (!nq) {
      // sólo si showOnEmpty === true se mostraría algo acá; por defecto no
      return ALL_OPTIONS.slice(0, limit);
    }
    const starts: Option[] = [];
    const includes: Option[] = [];
    for (const opt of ALL_OPTIONS) {
      if (opt.tokens.includes(nq)) {
        if (opt.tokens.startsWith(nq) || opt.tokens.split(" ").some((w) => w.startsWith(nq))) {
          starts.push(opt);
        } else {
          includes.push(opt);
        }
      }
      if (starts.length + includes.length >= limit * 3) break; // corta trabajo
    }
    return [...starts, ...includes].slice(0, limit);
  }, [raw, canOpen, limit]);

  useEffect(() => {
    setOpen(canOpen && results.length > 0);
    setActive(0);
  }, [canOpen, results.length]);

  // cerrar al click fuera
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function select(opt: Option) {
    onChange(opt.label, { prov_id: opt.prov_id, depto_id: opt.depto_id });
    setQ(opt.label);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (canOpen && results.length > 0) setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
      scrollActiveIntoView(Math.min(active + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
      scrollActiveIntoView(Math.max(active - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = results[active];
      if (opt) select(opt);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function scrollActiveIntoView(idx: number) {
    const ul = listRef.current;
    if (!ul) return;
    const li = ul.children[idx] as HTMLElement | undefined;
    if (!li) return;
    const liTop = li.offsetTop;
    const liBottom = liTop + li.offsetHeight;
    const viewTop = ul.scrollTop;
    const viewBottom = viewTop + ul.clientHeight;
    if (liTop < viewTop) ul.scrollTop = liTop;
    else if (liBottom > viewBottom) ul.scrollTop = liBottom - ul.clientHeight;
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        value={q}
        onChange={(e) => {
          const v = e.target.value;
          setQ(v);
          onChange(v);
        }}
        onFocus={() => setOpen(canOpen && results.length > 0)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700"
      />

      {/* Hint cuando aún no se alcanzó el mínimo */}
      {!showOnEmpty && norm(q).length > 0 && norm(q).length < minChars && (
        <div className="absolute left-0 top-full mt-1 text-xs text-gray-500">
          Escribí al menos {minChars} {minChars === 1 ? "carácter" : "caracteres"}…
        </div>
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Sin coincidencias</div>
          ) : (
            <ul
              ref={listRef}
              className="py-1 /* sin scroll interno al limitar los resultados */"
              role="listbox"
              aria-label="Resultados de ubicación"
            >
              {results.map((opt, i) => (
                <li
                  key={`${opt.prov_id}-${opt.depto_id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // evita blur antes del click
                    select(opt);
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer ${
                    i === active
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-100 dark:hover:bg-gray-900"
                  }`}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
