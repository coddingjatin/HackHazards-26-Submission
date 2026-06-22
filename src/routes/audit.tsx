import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { TopBar } from "@/components/TopBar";
import { StatusBadge } from "@/components/StatusBadge";
import { useStore } from "@/lib/store";
import { truncateHash } from "@/lib/hashChain";
import { useLiveReadings } from "@/lib/useLiveReadings";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit log — ColdChain" }] }),
  component: () => (
    <RoleGuard allow={["manager"]}>
      <Audit />
    </RoleGuard>
  ),
});

function Audit() {
  const shipments = useStore((s) => s.shipments);
  const selectedId = useStore((s) => s.selectedShipmentId);
  const selectShipment = useStore((s) => s.selectShipment);

  const { readings } = useLiveReadings(selectedId);
  const shipment = shipments.find((s) => s.id === selectedId)!;

  const getLocationName = (lat: number, lng: number, index: number) => {
    if (index === 0) return shipment.origin;
    if (index >= readings.length - 1 && readings.length >= shipment.route.length)
      return shipment.destination;

    // Simulate some road names/points of interest
    const routePoints = [
      "NH-60, Bypass",
      "NH-60, Toll Plaza",
      "NH-44, Sangamner",
      "NH-44, Nashik Road",
      "Panchvati area",
    ];
    return routePoints[index % routePoints.length];
  };

  return (
    <div className="bg-background min-h-screen">
      <TopBar title="Manager" />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Audit log</h1>
          <select
            value={selectedId}
            onChange={(e) => selectShipment(e.target.value)}
            className="border-input bg-card rounded-md border px-3 py-2 text-sm"
          >
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.product}
              </option>
            ))}
          </select>
        </div>
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>Append-only · SHA-256 hash chain · {readings.length} rows</span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 animate-pulse rounded-full bg-success" />
            Live monitoring active
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border bg-[#121212] text-[#e0e0e0]">
          {readings.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">
              No readings yet. Start the simulator on the dashboard.
            </div>
          ) : (
            <div className="max-h-[75vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#1a1a1a] text-left text-xs uppercase text-[#888]">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">Temp</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">prev_hash</th>
                    <th className="px-4 py-3 font-medium">row_hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {[...readings].reverse().map((r, idx) => {
                    const originalIdx = readings.length - 1 - idx;
                    const isBreach = r.status === "breach";
                    const isWarning = r.status === "warning";

                    return (
                      <tr
                        key={r.ts}
                        className={`transition-colors ${
                          isBreach
                            ? "bg-[#3d1a1a] hover:bg-[#4d1a1a]"
                            : isWarning
                              ? "bg-[#3d2a0a] hover:bg-[#4d2a0a]"
                              : "hover:bg-[#1a1a1a]"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-[#666]">
                          {String(r.id).padStart(3, "0")}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {new Date(r.ts).toLocaleTimeString([], {
                            hour12: false,
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-medium">
                          {r.temp.toFixed(1)}°C
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isBreach
                                ? "bg-[#ff4444] text-white"
                                : isWarning
                                  ? "bg-[#ffbb33] text-black"
                                  : r.status === "ok" && originalIdx > 0 && readings[originalIdx-1].status === "breach"
                                    ? "bg-[#00c851] text-white"
                                    : "border border-[#00c851]/30 text-[#00c851]"
                            }`}
                          >
                            {r.status === "ok" && originalIdx > 0 && readings[originalIdx-1].status === "breach" ? "Restored" : r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#aaa]">
                          {getLocationName(r.lat, r.lng, originalIdx)}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#666]">
                          <span className="bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#222]">
                            {truncateHash(r.prevHash, 6)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#aaa]">
                          <span className="bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#222]">
                            {truncateHash(r.rowHash, 6)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
