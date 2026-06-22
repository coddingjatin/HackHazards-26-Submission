import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { TopBar } from "@/components/TopBar";
import { StatusBadge } from "@/components/StatusBadge";
import { TempChart } from "@/components/TempChart";
import { MapView } from "@/components/MapView";
import { ChatPanel } from "@/components/ChatPanel";
import { Toasts } from "@/components/Toasts";
import { useStore } from "@/lib/store";
import { predictBreachMinutes } from "@/lib/simulator";
import { controlSim, useLiveReadings, type ConnStatus } from "@/lib/useLiveReadings";
import { generateCompliancePDF } from "@/lib/pdf";

export const Route = createFileRoute("/manager")({
  head: () => ({ meta: [{ title: "Manager dashboard — ColdChain" }] }),
  component: () => (
    <RoleGuard allow={["manager"]}>
      <ManagerDashboard />
    </RoleGuard>
  ),
});

function ManagerDashboard() {
  const shipments = useStore((s) => s.shipments);
  const selectedId = useStore((s) => s.selectedShipmentId);
  const selectShipment = useStore((s) => s.selectShipment);

  const live = useLiveReadings(selectedId);
  const { readings, alerts, status: connStatus, speed, running } = live;

  const shipment = shipments.find((s) => s.id === selectedId)!;
  const last = readings[readings.length - 1];
  const breaches = readings.filter((r) => r.status === "breach").length;
  const compliance = readings.length ? Math.round(((readings.length - breaches) / readings.length) * 100) : 100;
  const predicted = useMemo(
    () => predictBreachMinutes(readings.map((r) => ({ ts: r.ts, temp: r.temp })), shipment.upperLimit),
    [readings, shipment.upperLimit],
  );

  const overallKind = last?.status ?? "ok";
  const [demoOpen, setDemoOpen] = useState(true);

  const reachedDestination = readings.length >= shipment.route.length;

  return (
    <div className="bg-background min-h-screen pb-12">
      <TopBar title="Manager" />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-5">
        {/* Top bar */}
        <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <select
              value={selectedId}
              onChange={(e) => selectShipment(e.target.value)}
              className="border-input bg-background rounded-md border px-3 py-2 text-sm"
            >
              {shipments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.product}
                </option>
              ))}
            </select>
            <StatusBadge kind={overallKind}>
              {overallKind === "ok" ? "All systems normal" : overallKind === "warning" ? "Approaching limit" : "BREACH"}
            </StatusBadge>
            <ConnPill status={connStatus} />
          </div>
          <div className="text-muted-foreground text-xs">
            {connStatus === "live"
              ? `Live stream · ${(2 / speed).toFixed(1)}s tick`
              : connStatus === "polling"
                ? "Polling fallback · 5s"
                : connStatus === "connecting"
                  ? "Connecting…"
                  : "Offline — retrying"}
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Current temp" value={last ? `${last.temp.toFixed(2)} °C` : "—"} tone={overallKind} />
          <Metric label="Safe range" value={`${shipment.lowerLimit}–${shipment.upperLimit} °C`} />
          <Metric label="Breach events" value={String(breaches)} tone={breaches ? "breach" : "ok"} />
          <Metric label="Compliance" value={`${compliance}%`} tone={compliance === 100 ? "ok" : compliance > 90 ? "warning" : "breach"} />
        </div>

        {/* Predict banner */}
        {predicted !== null && !reachedDestination && (
          <div className="bg-warning/15 border-warning/30 text-warning-foreground flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium">
            ⚠ Breach predicted in ~{predicted.toFixed(1)} minutes based on current trend.
          </div>
        )}

        {/* Destination Reached banner */}
        {reachedDestination && (
          <div className="bg-success/15 border-success/30 text-success-foreground flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium">
            <div className="flex items-center gap-3">
              <span>✅ Destination reached. Shipment completed.</span>
            </div>
            <button
              onClick={() => generateCompliancePDF(shipment, readings, null, "0x...demo")}
              className="bg-success text-success-foreground rounded-lg px-4 py-1.5 text-xs font-bold hover:opacity-90"
            >
              📄 Generate Compliance PDF
            </button>
          </div>
        )}

        {/* Chart + map */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="bg-card rounded-xl border p-4 lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Temperature trace</h3>
              <span className="text-muted-foreground text-xs">{readings.length} readings</span>
            </div>
            <div className="h-[280px]">
              {readings.length === 0 ? (
                <Skeleton />
              ) : (
                <TempChart readings={readings} upper={shipment.upperLimit} lower={shipment.lowerLimit} />
              )}
            </div>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <h3 className="mb-2 font-semibold">Route & truck</h3>
            <div className="h-[280px] overflow-hidden rounded-lg">
              <MapView shipment={shipment} readings={readings} />
            </div>
          </div>
        </div>

        {/* Alerts + Demo */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="bg-card rounded-xl border lg:col-span-2">
            <div className="border-b px-4 py-3">
              <h3 className="font-semibold">Alert log</h3>
            </div>
            <div className="max-h-72 divide-y overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="text-muted-foreground p-6 text-center text-sm">
                  No alerts yet — system nominal.
                </div>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                    <span className="text-muted-foreground tabular-nums text-xs">
                      {new Date(a.ts).toLocaleTimeString()}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        a.kind === "breach"
                          ? "bg-destructive/15 text-destructive"
                          : a.kind === "restored"
                            ? "bg-success/15 text-success"
                            : a.kind === "dispatch"
                              ? "bg-primary/10 text-primary"
                              : "bg-warning/20"
                      }`}
                    >
                      {a.kind}
                    </span>
                    <span className="flex-1">{a.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl border">
            <button
              onClick={() => setDemoOpen((o) => !o)}
              className="flex w-full items-center justify-between border-b px-4 py-3 text-left"
            >
              <span className="font-semibold">Demo controls</span>
              <span className="text-muted-foreground text-xs">{demoOpen ? "▾" : "▸"}</span>
            </button>
            {demoOpen && (
              <div className="space-y-3 p-4">
                <div className="flex gap-2">
                  {!running ? (
                    <button
                      onClick={() => controlSim(selectedId, { action: "start" })}
                      className="bg-success text-success-foreground flex-1 rounded-md py-2.5 text-sm font-semibold hover:opacity-90"
                    >
                      ▶ Start Sim
                    </button>
                  ) : (
                    <button
                      onClick={() => controlSim(selectedId, { action: "stop" })}
                      className="bg-warning text-warning-foreground flex-1 rounded-md py-2.5 text-sm font-semibold hover:opacity-90"
                    >
                      ⏸ Stop Sim
                    </button>
                  )}
                  <button
                    onClick={() => controlSim(selectedId, { action: "reset" })}
                    className="bg-secondary hover:bg-accent flex-1 rounded-md py-2 text-sm"
                  >
                    Reset
                  </button>
                </div>

                <button
                  onClick={() => controlSim(selectedId, { action: "inject" })}
                  disabled={!running}
                  className="bg-destructive text-destructive-foreground w-full rounded-md py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  💥 Inject breach now
                </button>
                
                <div>
                  <div className="text-muted-foreground mb-1 text-xs">Speed multiplier</div>
                  <div className="flex gap-1">
                    {([1, 5, 10] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => controlSim(selectedId, { action: "speed", speed: s })}
                        className={`flex-1 rounded-md py-1.5 text-sm ${speed === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <ChatPanel shipment={shipment} readings={readings} />
      <Toasts />
    </div>
  );
}

function ConnPill({ status }: { status: ConnStatus }) {
  const map: Record<ConnStatus, { label: string; cls: string; dot: string }> = {
    live: { label: "LIVE", cls: "bg-success/15 text-success border-success/30", dot: "bg-success animate-pulse" },
    polling: { label: "POLLING", cls: "bg-warning/15 text-warning-foreground border-warning/30", dot: "bg-warning" },
    connecting: { label: "CONNECTING", cls: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground animate-pulse" },
    offline: { label: "OFFLINE", cls: "bg-destructive/15 text-destructive border-destructive/30", dot: "bg-destructive" },
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${m.cls}`}>
      <span className={`size-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function Metric({ label, value, tone = "ok" as "ok" | "warning" | "breach" }: { label: string; value: string; tone?: "ok" | "warning" | "breach" }) {
  const ring =
    tone === "breach" ? "ring-destructive/30" : tone === "warning" ? "ring-warning/40" : "ring-transparent";
  return (
    <div className={`bg-card rounded-xl border p-4 ring-2 ${ring}`}>
      <div className="text-muted-foreground text-xs uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Skeleton() {
  return <div className="bg-muted h-full animate-pulse rounded-lg" />;
}
