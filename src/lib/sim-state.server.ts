// Server-side cold-chain simulator (in-memory only, Firestore optional)
import { computeRowHash } from "./hashChain";
import type { AlertEvent, Reading, ReadingStatus } from "./types";

const GENESIS = "0".repeat(64);

function buildRoute(): { lat: number; lng: number }[] {
  const start = { lat: 18.5204, lng: 73.8567 };
  const end = { lat: 19.9975, lng: 73.7898 };
  const n = 24;
  return Array.from({ length: n }, (_, i) => ({
    lat: start.lat + ((end.lat - start.lat) * i) / (n - 1),
    lng: start.lng + ((end.lng - start.lng) * i) / (n - 1),
  }));
}

type ShipState = {
  shipmentId: string;
  upperLimit: number;
  lowerLimit: number;
  route: { lat: number; lng: number }[];
  speed: 1 | 5 | 10;
  resetAt: number;
  nextTick: number;
  baseTemp: number;
  prevHash: string;
  readings: Reading[];
  alerts: AlertEvent[];
  injectStep: number;
  running: boolean;
};

const states = new Map<string, ShipState>();

function defaultState(shipmentId: string): ShipState {
  return {
    shipmentId,
    upperLimit: 8,
    lowerLimit: 2,
    route: buildRoute(),
    speed: 1,
    resetAt: Date.now(),
    nextTick: 0,
    baseTemp: 4.5,
    prevHash: GENESIS,
    readings: [],
    alerts: [],
    injectStep: 0,
    running: false,
  };
}

export function getState(shipmentId: string): ShipState {
  let s = states.get(shipmentId);
  if (!s) {
    s = defaultState(shipmentId);
    states.set(shipmentId, s);
  }
  return s;
}

export function resetShipment(shipmentId: string) {
  const s = defaultState(shipmentId);
  states.set(shipmentId, s);
  return s;
}

export function setSpeed(shipmentId: string, speed: 1 | 5 | 10) {
  const s = getState(shipmentId);
  const intervalOld = 2000 / s.speed;
  const intervalNew = 2000 / speed;
  const elapsedTicks = s.nextTick;
  s.resetAt = Date.now() - elapsedTicks * intervalNew;
  s.speed = speed;
  void intervalOld;
  return s;
}

export function injectBreach(shipmentId: string) {
  const s = getState(shipmentId);
  if (s.injectStep === 0) s.injectStep = 1;
  return s;
}

export function startSim(shipmentId: string) {
  const s = getState(shipmentId);
  if (!s.running) {
    const intervalMs = 2000 / s.speed;
    s.resetAt = Date.now() - s.nextTick * intervalMs;
    s.running = true;
  }
  return s;
}

export function stopSim(shipmentId: string) {
  const s = getState(shipmentId);
  s.running = false;
  return s;
}

export async function tick(shipmentId: string): Promise<Reading[]> {
  const s = getState(shipmentId);
  if (!s.running) return [];
  
  const intervalMs = 2000 / s.speed;
  const now = Date.now();
  const targetTicks = Math.floor((now - s.resetAt) / intervalMs) + 1;
  const newOnes: Reading[] = [];

  while (s.nextTick < targetTicks) {
    if (s.nextTick >= s.route.length) {
      s.running = false;
      break;
    }
    const i = s.nextTick;
    const ts = s.resetAt + i * intervalMs;

    let temp: number;
    if (s.injectStep > 0 && s.injectStep <= 3) {
      temp = 7.5 + s.injectStep * 0.6 + (Math.random() - 0.5) * 0.15;
      s.injectStep++;
      if (s.injectStep > 3) s.injectStep = -3;
    } else if (s.injectStep < 0) {
      temp = 9 + s.injectStep * 1.2 + (Math.random() - 0.5) * 0.2;
      s.injectStep++;
    } else {
      s.baseTemp += (Math.random() - 0.5) * 0.08;
      s.baseTemp = Math.max(3.5, Math.min(5.5, s.baseTemp));
      temp = s.baseTemp + (Math.random() - 0.5) * 0.3;
    }

    let status: ReadingStatus = "ok";
    if (temp > s.upperLimit || temp < s.lowerLimit) status = "breach";
    else if (temp > s.upperLimit - 0.7 || temp < s.lowerLimit + 0.7) status = "warning";

    const routeIdx = Math.min(i, s.route.length - 1);
    const gps = s.route[routeIdx];
    const sensorId = "TS-9F2A";
    const rowHash = await computeRowHash(ts, temp, sensorId, s.prevHash);

    const reading: Reading = {
      id: i + 1,
      shipmentId,
      ts,
      temp,
      sensorId,
      lat: gps.lat,
      lng: gps.lng,
      status,
      prevHash: s.prevHash,
      rowHash,
    };

    const last = s.readings[s.readings.length - 1];
    const wasBreach = last?.status === "breach";
    if (status === "breach" && !wasBreach) {
      s.alerts.unshift({
        id: Math.random().toString(36).slice(2),
        shipmentId,
        ts,
        kind: "breach",
        message: `Threshold breach: ${temp.toFixed(2)}°C @ ${gps.lat.toFixed(3)},${gps.lng.toFixed(3)}`,
      });
      s.alerts.unshift({
        id: Math.random().toString(36).slice(2),
        shipmentId,
        ts: ts + 1,
        kind: "dispatch",
        message: "WhatsApp + email alert dispatched to manager (simulated)",
      });
    } else if (status === "ok" && wasBreach) {
      s.alerts.unshift({
        id: Math.random().toString(36).slice(2),
        shipmentId,
        ts,
        kind: "restored",
        message: `Temperature restored to safe range (${temp.toFixed(2)}°C)`,
      });
    }

    s.readings.push(reading);
    s.prevHash = rowHash;
    s.nextTick = i + 1;
    newOnes.push(reading);
  }

  if (s.readings.length > 5000) s.readings = s.readings.slice(-2000);
  if (s.alerts.length > 500) s.alerts = s.alerts.slice(0, 200);

  return newOnes;
}

export function snapshot(shipmentId: string, sinceTs = 0) {
  const s = getState(shipmentId);
  const readings = sinceTs > 0 ? s.readings.filter((x) => x.ts > sinceTs) : s.readings;
  const alerts = sinceTs > 0 ? s.alerts.filter((x) => x.ts > sinceTs) : s.alerts;
  return {
    shipmentId,
    speed: s.speed,
    upperLimit: s.upperLimit,
    lowerLimit: s.lowerLimit,
    serverTs: Date.now(),
    running: s.running,
    resetAt: s.resetAt,
    readings,
    alerts,
  };
}
