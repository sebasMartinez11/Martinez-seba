import { useEffect, useRef, useState } from "react";
import { FiUser, FiLogOut } from "react-icons/fi";

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
}

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(() => setOpen(false));

  const user = { name: "Agente", email: "agente@realconnect.com" };
  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 flex items-center gap-2"
        title="Cuenta"
      >
        <div className="h-6 w-6 rounded-full bg-blue-600 text-white grid place-items-center text-xs">{initials}</div>
        <span className="hidden sm:block text-sm">{user.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg p-2">
          <div className="px-2 py-2">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
          </div>
          <hr className="border-gray-200 dark:border-gray-800" />
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
            onClick={() => alert("TODO: ir a perfil")}
          >
            <FiUser /> Perfil
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-rose-500 hover:bg-rose-50/40 dark:hover:bg-rose-900/20"
            onClick={() => alert("TODO: cerrar sesión")}
          >
            <FiLogOut /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
