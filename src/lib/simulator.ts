import { useEffect, useRef } from "react";
import { useStore, GENESIS, computeRowHash } from "./store";
import type { Reading, ReadingStatus } from "./types";

export function useSimulator() {
  const ref = useRef({ baseTemp: 4.5, idx: 0, injectStep: 0 });

  const running = useStore((s) => s.simulatorRunning);
  const speed = useStore((s) => s.speed);
  const shipmentId = useStore((s) => s.selectedShipmentId);
  const shipment = useStore((s) =>
    s.shipments.find((x) => x.id === s.selectedShipmentId),
  );
  const readings = useStore((s) => s.readings[s.selectedShipmentId] ?? []);
  const injectFlag = useStore((s) => s.injectFlag);
  const pushReading = useStore((s) => s.pushReading);
  const pushAlert = useStore((s) => s.pushAlert);
  const pushToast = useStore((s) => s.pushToast);

  // latest refs to avoid stale closure
  const readingsRef = useRef(readings);
  readingsRef.current = readings;
  const injectRef = useRef(injectFlag);
  injectRef.current = injectFlag;

  useEffect(() => {
    if (!running || !shipment) return;
    const intervalMs = Math.max(400, 2000 / speed);

    const tick = async () => {
      const prev = readingsRef.current;
      const last = prev[prev.length - 1];
      const prevHash = last?.rowHash ?? GENESIS;

      // inject breach: 3 escalating readings
      if (injectRef.current && ref.current.injectStep === 0) ref.current.injectStep = 1;
      let temp: number;
      if (ref.current.injectStep > 0 && ref.current.injectStep <= 3) {
        temp = 7.5 + ref.current.injectStep * 0.6 + (Math.random() - 0.5) * 0.15;
        ref.current.injectStep++;
        if (ref.current.injectStep > 3) {
          useStore.setState({ injectFlag: false });
          // schedule recovery
          setTimeout(() => {
            ref.current.injectStep = -3;
          }, 0);
        }
      } else if (ref.current.injectStep < 0) {
        temp = 9 + ref.current.injectStep * 1.2 + (Math.random() - 0.5) * 0.2;
        ref.current.injectStep++;
      } else {
        ref.current.baseTemp += (Math.random() - 0.5) * 0.08;
        ref.current.baseTemp = Math.max(3.5, Math.min(5.5, ref.current.baseTemp));
        temp = ref.current.baseTemp + (Math.random() - 0.5) * 0.3;
      }

      const route = shipment.route;
      const routeIdx = Math.min(prev.length, route.length - 1);
      const gps = route[routeIdx];

      let status: ReadingStatus = "ok";
      if (temp > shipment.upperLimit || temp < shipment.lowerLimit) status = "breach";
      else if (temp > shipment.upperLimit - 0.7 || temp < shipment.lowerLimit + 0.7) status = "warning";

      const ts = Date.now();
      const sensorId = "TS-9F2A";
      const rowHash = await computeRowHash(ts, temp, sensorId, prevHash);

      const reading: Reading = {
        id: prev.length + 1,
        shipmentId: shipment.id,
        ts,
        temp,
        sensorId,
        lat: gps.lat,
        lng: gps.lng,
        status,
        prevHash,
        rowHash,
      };
      pushReading(reading);

      const wasBreach = last?.status === "breach";
      if (status === "breach" && !wasBreach) {
        pushAlert({
          id: Math.random().toString(36).slice(2),
          shipmentId: shipment.id,
          ts,
          kind: "breach",
          message: `Threshold breach: ${temp.toFixed(2)}°C @ ${gps.lat.toFixed(3)},${gps.lng.toFixed(3)}`,
        });
        pushAlert({
          id: Math.random().toString(36).slice(2),
          shipmentId: shipment.id,
          ts: ts + 1,
          kind: "dispatch",
          message: "WhatsApp + email alert dispatched to manager (simulated)",
        });
        pushToast("breach", `Breach detected — ${temp.toFixed(2)}°C`);
      } else if (status === "ok" && wasBreach) {
        pushAlert({
          id: Math.random().toString(36).slice(2),
          shipmentId: shipment.id,
          ts,
          kind: "restored",
          message: `Temperature restored to safe range (${temp.toFixed(2)}°C)`,
        });
        pushToast("ok", "Temperature restored to safe range");
      }
    };

    const iv = setInterval(tick, intervalMs);
    return () => clearInterval(iv);
  }, [running, speed, shipmentId, shipment, pushReading, pushAlert, pushToast]);

  // Trigger inject state machine when flag flips
  useEffect(() => {
    if (injectFlag && ref.current.injectStep === 0) ref.current.injectStep = 1;
  }, [injectFlag]);
}

// Linear regression projection for predictive breach (returns minutes to breach or null)
export function predictBreachMinutes(
  readings: { ts: number; temp: number }[],
  upper: number,
): number | null {
  const n = Math.min(10, readings.length);
  if (n < 4) return null;
  const slice = readings.slice(-n);
  const t0 = slice[0].ts;
  const xs = slice.map((r) => (r.ts - t0) / 60000); // minutes
  const ys = slice.map((r) => r.temp);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  const intercept = my - slope * mx;
  if (slope <= 0.02) return null;
  const lastX = xs[xs.length - 1];
  const xBreach = (upper - intercept) / slope;
  const dt = xBreach - lastX;
  if (dt > 0 && dt < 20) return dt;
  return null;
}
