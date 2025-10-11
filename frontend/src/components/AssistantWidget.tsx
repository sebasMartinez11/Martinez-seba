// src/components/AssistantWidget.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../lib/api";

type AskResponse = {
  answer: string;
  data: {
    count: number;
    from?: string | null;
    to?: string | null;
    type?: string | null;
    items: Array<{
      id: number;
      tipo: "Reunion" | "Llamada" | "Visita";
      fecha_hora: string;        // "YYYY-MM-DD HH:MM" local
      propiedad?: number | null;
      propiedad_titulo?: string | null;
      contacto?: number | null;
      contacto_nombre?: string | null;
      notas?: string;
    }>;
  };
};

type Message =
  | { role: "user"; text: string; ts: number }
  | { role: "assistant"; text: string; ts: number; payload?: AskResponse["data"] }
  | { role: "system"; text: string; ts: number };

export default function AssistantWidget() {
  // Mostrar solo dentro de /app y si hay token
  const inApp = useMemo(
    () => typeof window !== "undefined" && window.location.pathname.startsWith("/app"),
    []
  );
  const hasToken = useMemo(() => {
    try {
      return !!localStorage.getItem("access");
    } catch {
      return false;
    }
  }, []);

  if (!inApp || !hasToken) return null;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text:
        "¡Hola! Soy tu asistente. Probá con:\n" +
        "• \"¿Qué reuniones tengo hoy?\"\n" +
        "• \"¿Qué visitas tengo mañana?\"\n" +
        "• \"Mostrame eventos esta semana\"\n" +
        "• \"Agregá evento el 5/10 a las 15:00 en @Propiedad 12 (visita)\"",
      ts: Date.now(),
    },
  ]);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function sendQuery(q: string) {
    if (!q.trim() || working) return;
    setError(null);
    setWorking(true);

    setMessages((m) => [...m, { role: "user", text: q.trim(), ts: Date.now() }]);
    setInput("");

    try {
      const { data } = await api.post<AskResponse>("asistente/ask/", { query: q.trim() });
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.answer, ts: Date.now(), payload: data.data },
      ]);
    } catch (e: any) {
      console.error(e);
      const detail =
        e?.response?.data?.detail ||
        (typeof e?.message === "string" ? e.message : "No se pudo consultar al asistente.");
      setError(detail);
      setMessages((m) => [
        ...m,
        { role: "system", text: "Ups, hubo un error al consultar al asistente.", ts: Date.now() },
      ]);
    } finally {
      setWorking(false);
    }
  }

  function handleKeyDown(ev: React.KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      sendQuery(input);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle */}
      <button
        className="mb-2 h-10 px-4 rounded-full shadow border rc-border rc-border rc-card text-sm text-gray-800 rc-text hover:bg-[rgb(var(--card))/0.4]"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="assistant-panel"
      >
        {open ? "Ocultar asistente" : "Abrir asistente"}
      </button>

      {/* Panel */}
      {open && (
        <div
          id="assistant-panel"
          className="w-[360px] max-w-[92vw] rounded-2xl border rc-border rc-border rc-card shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b rc-border rc-border flex items-center justify-between">
            <div className="font-medium rc-text rc-text">Asistente</div>
            <div className="text-xs rc-muted">beta</div>
          </div>

          {/* mensajes */}
          <div
            ref={listRef}
            className="max-h-[50vh] overflow-auto px-3 py-3 space-y-2 rc-card/40"
          >
            {messages.map((m, idx) => (
              <MessageBubble key={idx} msg={m} />
            ))}
          </div>

          {/* error */}
          {error && (
            <div className="px-4 py-2 text-xs text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-900/30 border-t border-rose-200 dark:border-rose-800">
              {error}
            </div>
          )}

          {/* input */}
          <div className="p-3 border-t rc-border rc-border rc-card">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 h-10 rounded-lg border rc-border rc-border rc-card px-3 text-sm rc-text rc-text placeholder:rc-muted dark:placeholder:rc-muted"
                placeholder='Ej: "¿Qué reuniones tengo hoy?"'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={working}
              />
              <button
                className="h-10 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 rc-text rc-text text-sm disabled:opacity-60"
                onClick={() => sendQuery(input)}
                disabled={working || !input.trim()}
              >
                {working ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================== UI Bits =========================== */
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const isAssistant = msg.role === "assistant";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
          isUser
            ? "bg-blue-600 rc-text rc-text shadow-md"
            : msg.role === "system"
            ? // System: contraste fuerte
              "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
            : // Assistant: alto contraste (fondo claro + borde)
              "bg-white rc-text dark:bg-gray-800 rc-text border rc-border rc-border"
        }`}
      >
        <div>{msg.text}</div>
        {isAssistant && msg.payload && msg.payload.items?.length > 0 && (
          <div className="mt-2">
            <EventsMiniList data={msg.payload} />
          </div>
        )}
      </div>
    </div>
  );
}

function EventsMiniList({ data }: { data: AskResponse["data"] }) {
  return (
    <div className="text-xs">
      <div className="mb-1 rc-muted dark:text-gray-300">
        {data.count} resultado{data.count === 1 ? "" : "s"}
        {data.type ? ` • ${data.type}` : ""}{" "}
        {data.from && data.to ? `• ${formatLocal(data.from)} → ${formatLocal(data.to)}` : ""}
      </div>
      <ul className="space-y-1">
        {data.items.slice(0, 8).map((it) => (
          <li
            key={it.id}
            className="rounded-lg border rc-border rc-border p-2 rc-card"
          >
            <div className="font-medium rc-text rc-text">
              {it.fecha_hora} · {it.tipo}
            </div>
            <div className="rc-muted dark:text-gray-300">
              {it.propiedad_titulo ? it.propiedad_titulo : it.propiedad ? `Propiedad #${it.propiedad}` : "—"}
              {it.contacto_nombre ? ` • ${it.contacto_nombre}` : ""}
            </div>
            {it.notas && <div className="rc-muted rc-muted mt-0.5 line-clamp-2">{it.notas}</div>}
          </li>
        ))}
      </ul>
      {data.items.length > 8 && (
        <div className="mt-1 rc-muted dark:text-gray-300">+ {data.items.length - 8} más…</div>
      )}
    </div>
  );
}

function formatLocal(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}
