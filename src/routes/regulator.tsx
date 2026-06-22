import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { TopBar } from "@/components/TopBar";
import { StatusBadge } from "@/components/StatusBadge";
import { useStore } from "@/lib/store";
import { useLiveReadings } from "@/lib/useLiveReadings";

export const Route = createFileRoute("/regulator")({
  head: () => ({ meta: [{ title: "Regulator portal — ColdChain" }] }),
  component: () => (
    <RoleGuard allow={["regulator"]}>
      <RegulatorList />
    </RoleGuard>
  ),
});

function RegulatorList() {
  const shipments = useStore((s) => s.shipments);

  return (
    <div className="bg-background min-h-screen">
      <TopBar title="Regulator" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-semibold">All shipments</h1>
        <div className="bg-card rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Shipment</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Readings</th>
                <th className="px-4 py-3">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shipments.map((s) => (
                <ShipmentRow key={s.id} shipment={s} />
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function ShipmentRow({ shipment }: { shipment: any }) {
  const { readings } = useLiveReadings(shipment.id);
  const br = readings.filter((r) => r.status === "breach").length;
  const kind = br === 0 ? "compliant" : br < 3 ? "review" : "failed";

  return (
    <tr className="hover:bg-accent/40">
      <td className="px-4 py-3 font-medium">{shipment.id}</td>
      <td className="text-muted-foreground px-4 py-3">{shipment.product}</td>
      <td className="text-muted-foreground px-4 py-3">{shipment.origin} → {shipment.destination}</td>
      <td className="px-4 py-3 tabular-nums">{readings.length}</td>
      <td className="px-4 py-3">
        <StatusBadge kind={kind}>
          {kind === "compliant" ? "Compliant" : kind === "review" ? "Review required" : "Failed"}
        </StatusBadge>
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          to="/regulator/$shipmentId"
          params={{ shipmentId: shipment.id }}
          className="text-primary hover:underline"
        >
          Open →
        </Link>
      </td>
    </tr>
  );
}
