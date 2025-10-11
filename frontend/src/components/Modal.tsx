import type { ReactNode } from "react";
import { useEffect } from "react";
import clsx from "clsx";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg";
};

export default function Modal({ open, title, onClose, children, maxWidth = "md" }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* dialog */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={clsx(
            "w-full rounded-2xl border rc-border rc-border rc-card shadow-xl",
            maxWidth === "sm" && "max-w-sm",
            maxWidth === "md" && "max-w-lg",
            maxWidth === "lg" && "max-w-2xl"
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="px-5 py-3 border-b rc-border rc-border">
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
