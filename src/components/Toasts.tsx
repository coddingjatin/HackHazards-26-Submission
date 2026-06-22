import { useStore } from "@/lib/store";

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur ${
            t.kind === "breach"
              ? "bg-destructive text-destructive-foreground border-destructive"
              : t.kind === "ok"
                ? "bg-success text-success-foreground border-success"
                : "bg-card"
          }`}
        >
          <span className="text-sm font-medium">{t.msg}</span>
          <button onClick={() => dismiss(t.id)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
}
