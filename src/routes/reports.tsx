import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { TopBar } from "@/components/TopBar";
import { StatusBadge } from "@/components/StatusBadge";
import { useStore } from "@/lib/store";
import { generateCompliancePDF } from "@/lib/pdf";
import { useLiveReadings } from "@/lib/useLiveReadings";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Compliance reports — ColdChain" }] }),
  component: () => (
    <RoleGuard allow={["manager"]}>
      <Reports />
    </RoleGuard>
  ),
});

function Reports() {
  const shipments = useStore((s) => s.shipments);
  return (
    <div className="bg-background min-h-screen">
      <TopBar title="Manager" />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <h1 className="text-2xl font-semibold">Compliance reports</h1>
        {shipments.map((s) => (
          <ReportCard key={s.id} shipment={s} />
        ))}
      </main>
    </div>
  );
}

function ReportCard({ shipment }: { shipment: any }) {
  const { readings } = useLiveReadings(shipment.id);
  const rd = readings;
  const br = rd.filter((r) => r.status === "breach").length;
  const okPct = rd.length ? Math.round(((rd.length - br) / rd.length) * 100) : 100;
  const kind = br === 0 ? "compliant" : br < 3 ? "review" : "failed";
  const dur = Math.round((Date.now() - shipment.startedAt) / 60000);
  const tx =
    shipment.blockchainTx ??
    "0x" +
      rd
        .map((r) => r.rowHash.slice(0, 2))
        .join("")
        .slice(0, 64)
        .padEnd(64, "0");

  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{shipment.id}</h2>
            <StatusBadge kind={kind}>
              {kind === "compliant" ? "Compliant" : kind === "review" ? "Review required" : "Failed"}
            </StatusBadge>
          </div>
          <div className="text-muted-foreground mt-1 text-sm">{shipment.product}</div>
        </div>
        <button
          onClick={() => generateCompliancePDF(shipment, rd, null, tx)}
          disabled={rd.length === 0}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Generate PDF
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
        <Box label="Origin" value={shipment.origin} />
        <Box label="Destination" value={shipment.destination} />
        <Box label="Duration" value={`${dur} min`} />
        <Box label="Time in range" value={`${okPct}%`} />
        <Box label="Breach events" value={String(br)} />
      </div>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <div className="text-muted-foreground text-xs uppercase">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
