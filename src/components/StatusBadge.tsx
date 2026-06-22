import type { ReadingStatus } from "@/lib/types";

const map: Record<ReadingStatus | "compliant" | "review" | "failed", string> = {
  ok: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/20 text-warning-foreground border-warning/40",
  breach: "bg-destructive/15 text-destructive border-destructive/40",
  compliant: "bg-success/15 text-success border-success/30",
  review: "bg-warning/20 text-warning-foreground border-warning/40",
  failed: "bg-destructive/15 text-destructive border-destructive/40",
};

export function StatusBadge({
  kind,
  children,
}: {
  kind: keyof typeof map;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[kind]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
