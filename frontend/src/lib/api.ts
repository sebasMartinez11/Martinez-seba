import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// === Leads ===
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
  const { data } = await api.get("/api/contactos/", { params });
  return data.results ?? data;
}

// === Propiedades ===
export type Propiedad = {
  id: number;
  codigo: string;
  titulo: string;
  descripcion?: string;
  ubicacion: string;
  tipo_de_propiedad: "casa" | "departamento" | "hotel";
  disponibilidad: string;
  precio: string;   // viene como decimal -> string
  moneda: "USD" | "ARS";
  ambiente: number;
  antiguedad: number;
  banos: number;
  superficie: string;
  fecha_alta: string;
  estado: "disponible" | "vendido" | "reservado";
};

export async function fetchPropiedades(params: Record<string, any> = {}) {
  const { data } = await api.get("/api/propiedades/", { params });
  return data.results ?? data;
}

// === Usuarios (solo lista simple) ===
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
  const { data } = await api.get("/api/usuarios/");
  return data.results ?? data;
}
