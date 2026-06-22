import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { TopBar } from "@/components/TopBar";
import { Toasts } from "@/components/Toasts";
import { useStore } from "@/lib/store";
import { useLiveReadings } from "@/lib/useLiveReadings";
import { predictBreachMinutes } from "@/lib/simulator";

export const Route = createFileRoute("/driver")({
  head: () => ({ meta: [{ title: "Driver view — ColdChain" }] }),
  component: () => (
    <RoleGuard allow={["driver"]}>
      <DriverView />
    </RoleGuard>
  ),
});

function DriverView() {
  const shipments = useStore((s) => s.shipments);
  const selectedId = useStore((s) => s.selectedShipmentId);
  const { readings, speed, status: connStatus } = useLiveReadings(selectedId);
  const shipment = shipments.find((s) => s.id === selectedId)!;

  const last = readings[readings.length - 1];
  const status = last?.status ?? "ok";
  const breach = status === "breach";

  const predicted = useMemo(
    () => predictBreachMinutes(readings.map((r) => ({ ts: r.ts, temp: r.temp })), shipment.upperLimit),
    [readings, shipment.upperLimit],
  );

  const progress = Math.min(100, (readings.length / shipment.route.length) * 100);
  const etaMinutes = Math.max(0, Math.round(((shipment.route.length - readings.length) * 2) / speed));

  return (
    <div className="bg-background min-h-screen">
      <TopBar title="Driver" />
      <main className="mx-auto max-w-md space-y-6 px-4 py-8">
        {/* Connection & Shipment Info */}
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Active Shipment</span>
            <span className="text-sm font-bold">{shipment.id}</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-secondary/50 px-3 py-1 text-[10px] font-bold">
            <span className={`size-1.5 rounded-full ${connStatus === "live" ? "bg-success animate-pulse" : "bg-warning"}`} />
            {connStatus === "live" ? "SENSOR CONNECTED" : "LINK STALLED"}
          </div>
        </div>

        {/* Primary Temp Display */}
        <div
          className={`rounded-[2.5rem] border-4 p-8 text-center shadow-xl transition-all duration-500 ${
            breach
              ? "bg-destructive/10 border-destructive shadow-destructive/20"
              : status === "warning"
                ? "bg-warning/10 border-warning shadow-warning/20"
                : "bg-success/10 border-success shadow-success/20"
          }`}
        >
          <div className="mb-2 text-6xl">{breach ? "🚨" : status === "warning" ? "⚠️" : "🌡️"}</div>
          <div className="text-7xl font-black tabular-nums tracking-tighter">
            {last ? `${last.temp.toFixed(1)}°` : "—"}
          </div>
          <div className="text-muted-foreground mt-2 text-sm font-medium">Cargo Temperature</div>
          
          <div className={`mt-6 text-xl font-black uppercase tracking-tight ${breach ? "text-destructive" : status === "warning" ? "text-warning-foreground" : "text-success"}`}>
            {breach ? "CRITICAL BREACH" : status === "warning" ? "LIMITS APPROACHING" : "SYSTEM NOMINAL"}
          </div>
        </div>

        {/* Predictive Warning */}
        {predicted !== null && !breach && (
          <div className="animate-pulse rounded-2xl bg-warning p-4 text-center text-warning-foreground shadow-lg">
            <div className="text-xs font-black uppercase tracking-widest">Predictive Alert</div>
            <div className="text-sm font-bold mt-1">
              Temperature breach likely in ~{predicted.toFixed(0)} min
            </div>
            <div className="text-[10px] mt-1 opacity-80">Check refrigeration unit immediately</div>
          </div>
        )}

        {/* Delivery Progress */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-[10px] font-bold uppercase">Destination</span>
              <span className="text-sm font-bold leading-tight">{shipment.destination}</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground text-[10px] font-bold uppercase">ETA</span>
              <div className="text-sm font-bold">{etaMinutes} MIN</div>
            </div>
          </div>
          
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-out" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
            <span>{shipment.origin}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
        </div>

        {/* Shipment Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-card p-4">
            <div className="text-muted-foreground text-[10px] font-bold uppercase">Safe Range</div>
            <div className="mt-1 text-sm font-bold">{shipment.lowerLimit}° - {shipment.upperLimit}°C</div>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <div className="text-muted-foreground text-[10px] font-bold uppercase">Sensor ID</div>
            <div className="mt-1 text-sm font-bold">TS-9F2A (Active)</div>
          </div>
        </div>

        <div className="text-center">
          <button 
            className="text-xs font-bold text-muted-foreground underline underline-offset-4 opacity-60 hover:opacity-100"
            onClick={() => window.location.reload()}
          >
            Refresh Dashboard Link
          </button>
        </div>
      </main>
      <Toasts />
    </div>
  );
}
