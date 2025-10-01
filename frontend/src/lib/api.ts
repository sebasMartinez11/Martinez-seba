// src/lib/api.ts
import axios from "axios";

/**
 * Debe terminar en /api/
 * Ej: VITE_API_URL = http://127.0.0.1:8000/api/
 */
export const API_BASE =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/";

/* ---------------- Cliente dedicado ---------------- */
export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  timeout: 15000,
});

/** Normaliza SOLO rutas relativas. Las absolutas (http/https) NO se tocan. */
function normalizeUrl(u?: string) {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u; // absoluta => no tocar

  let url = u;
  // quita prefijo /api/ o api/ para evitar /api/api
  if (url.startsWith("/api/")) url = url.slice(5);
  else if (url.startsWith("api/")) url = url.slice(4);

  // compacta slashes múltiples
  url = url.replace(/\/{2,}/g, "/");
  return url;
}

/* --- Bearer + normalización para el cliente dedicado --- */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.url) config.url = normalizeUrl(config.url);
  return config;
});

/* -------- Parche global para axios “crudo” (por si alguna vista lo usa) -------- */
axios.defaults.baseURL = API_BASE;
axios.defaults.headers.common["Accept"] = "application/json";
axios.defaults.timeout = 15000;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.url = normalizeUrl(config.url);
  }
  return config;
});

/* ----- Leads ----- */
export type Contacto = {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  estado: number | null;
  estado_fase?: string | null;
  proximo_contacto?: string | null;
  ultimo_contacto?: string | null;
};

export async function fetchLeads(params: Record<string, any> = {}) {
  const { data } = await api.get("contactos/", { params });
  return data.results ?? data;
}

/* ----- Propiedades ----- */
export type Propiedad = {
  id: number;
  codigo: string;
  titulo: string;
  descripcion?: string;
  ubicacion: string;
  tipo_de_propiedad: "casa" | "departamento" | "hotel";
  disponibilidad: string;
  precio: string;
  moneda: "USD" | "ARS";
  ambiente: number;
  antiguedad: number;
  banos: number;
  superficie: string;
  fecha_alta: string;
  estado: "disponible" | "vendido" | "reservado";
};

export async function fetchPropiedades(params: Record<string, any> = {}) {
  const { data } = await api.get("propiedades/", { params });
  return data.results ?? data;
}

/* ----- Usuarios ----- */
export type Usuario = {
  id: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  telefono?: string;
  dni?: string;
};

export async function fetchUsuarios() {
  const { data } = await api.get("usuarios/");
  return data.results ?? data;
}

/* ----- Eventos ----- */
export type Evento = {
  id: number;
  owner?: number; // read-only (puede no venir en todas las vistas)
  nombre?: string;
  apellido?: string;
  email?: string | null;
  contacto: number | null;
  propiedad: number;
  tipo: "Reunion" | "Visita" | "Llamada";
  fecha_hora: string; // ISO
  notas?: string;
  creado_en?: string;
};

export type EventoFilters = {
  date?: string;       // YYYY-MM-DD (día exacto)
  from?: string;       // YYYY-MM-DD (inicio, inclusive)
  to?: string;         // YYYY-MM-DD (fin, exclusivo)
  types?: string;      // "Reunion" | "Llamada" | "Visita"
  ordering?: string;   // ej: "fecha_hora"
  [k: string]: any;    // permitir extras sin romper TS
};

export async function fetchEventos(params: EventoFilters = {}) {
  const { data } = await api.get("eventos/", { params });
  return data.results ?? data;
}

export default api;
