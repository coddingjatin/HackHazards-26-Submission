import { useEffect, useRef, useState } from "react";
import type { AlertEvent, Reading } from "./types";

export type ConnStatus = "connecting" | "live" | "polling" | "offline";

export interface LiveState {
  readings: Reading[];
  alerts: AlertEvent[];
  status: ConnStatus;
  speed: 1 | 5 | 10;
  running: boolean;
  lastUpdate: number | null;
}

interface Snapshot {
  shipmentId: string;
  speed: 1 | 5 | 10;
  upperLimit: number;
  lowerLimit: number;
  serverTs: number;
  running: boolean;
  resetAt: number;
  readings: Reading[];
  alerts: AlertEvent[];
}

const POLL_MS = 5000;
const BACKOFF = [1000, 2000, 4000, 8000, 15000, 30000];

export function useLiveReadings(shipmentId: string) {
  const [state, setState] = useState<LiveState>({
    readings: [],
    alerts: [],
    status: "connecting",
    speed: 1,
    running: true,
    lastUpdate: null,
  });

  const refs = useRef({
    readings: [] as Reading[],
    alerts: [] as AlertEvent[],
    lastTs: 0,
    resetAt: 0,
    sse: null as EventSource | null,
    pollTimer: null as ReturnType<typeof setInterval> | null,
    reconnectTimer: null as ReturnType<typeof setTimeout> | null,
    attempt: 0,
    cancelled: false,
    status: "connecting" as ConnStatus,
  });

  useEffect(() => {
    const r = refs.current;
    r.cancelled = false;
    r.readings = [];
    r.alerts = [];
    r.lastTs = 0;
    r.attempt = 0;

    const setStatus = (status: ConnStatus) => {
      r.status = status;
      setState((s) => (s.status === status ? s : { ...s, status }));
    };

    const apply = (snap: Snapshot, mode: "replace" | "append") => {
      const isReset = r.resetAt > 0 && snap.resetAt !== r.resetAt;
      r.resetAt = snap.resetAt;

      if (mode === "replace" || isReset) {
        r.readings = snap.readings.slice();
        r.alerts = snap.alerts.slice();
      } else {
        // dedupe by ts
        const known = new Set(r.readings.map((x) => x.ts));
        for (const x of snap.readings) if (!known.has(x.ts)) r.readings.push(x);
        const knownA = new Set(r.alerts.map((x) => x.id));
        const newAlerts = snap.alerts.filter((x) => !knownA.has(x.id));
        r.alerts = [...newAlerts, ...r.alerts];
      }
      if (r.readings.length) r.lastTs = r.readings[r.readings.length - 1].ts;
      setState({
        readings: r.readings.slice(),
        alerts: r.alerts.slice(),
        status: r.status,
        speed: snap.speed,
        running: snap.running,
        lastUpdate: Date.now(),
      });
    };

    const pollOnce = async () => {
      try {
        const res = await fetch(`/api/public/readings/${shipmentId}?since=${r.lastTs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const snap = (await res.json()) as Snapshot;
        apply(snap, r.lastTs === 0 ? "replace" : "append");
        if (r.status === "offline") setStatus("polling");
      } catch {
        setStatus("offline");
      }
    };

    const startPolling = () => {
      if (r.pollTimer) return;
      pollOnce();
      r.pollTimer = setInterval(pollOnce, POLL_MS);
    };
    const stopPolling = () => {
      if (r.pollTimer) {
        clearInterval(r.pollTimer);
        r.pollTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (r.cancelled) return;
      const delay = BACKOFF[Math.min(r.attempt, BACKOFF.length - 1)];
      r.attempt++;
      if (r.reconnectTimer) clearTimeout(r.reconnectTimer);
      r.reconnectTimer = setTimeout(connectSSE, delay);
    };

    const connectSSE = () => {
      if (r.cancelled) return;
      try {
        if (r.sse) {
          r.sse.close();
          r.sse = null;
        }
        setStatus(r.readings.length ? "polling" : "connecting");
        const es = new EventSource(`/api/public/stream/${shipmentId}?since=${r.lastTs}`);
        r.sse = es;
        es.addEventListener("snapshot", (ev) => {
          const snap = JSON.parse((ev as MessageEvent).data) as Snapshot;
          apply(snap, r.lastTs === 0 ? "replace" : "append");
          setStatus("live");
          r.attempt = 0;
          // SSE is live → stop polling
          stopPolling();
        });
        es.addEventListener("delta", (ev) => {
          const snap = JSON.parse((ev as MessageEvent).data) as Snapshot;
          apply(snap, "append");
          setStatus("live");
        });
        es.addEventListener("ping", () => {
          if (r.status !== "live") setStatus("live");
        });
        es.onerror = () => {
          if (r.cancelled) return;
          es.close();
          r.sse = null;
          startPolling(); // fallback active
          scheduleReconnect();
        };
      } catch {
        startPolling();
        scheduleReconnect();
      }
    };

    connectSSE();

    return () => {
      r.cancelled = true;
      if (r.sse) r.sse.close();
      if (r.reconnectTimer) clearTimeout(r.reconnectTimer);
      stopPolling();
    };
  }, [shipmentId]);

  return state;
}

export async function controlSim(
  shipmentId: string,
  body: { action: "inject" } | { action: "reset" } | { action: "start" } | { action: "stop" } | { action: "speed"; speed: 1 | 5 | 10 },
) {
  await fetch("/api/public/control", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shipmentId, ...body }),
  });
}
