import { create } from "zustand";
import type { AlertEvent, Reading, Role, Shipment } from "./types";
import { computeRowHash, sha256Hex } from "./hashChain";

const GENESIS = "0".repeat(64);

// Generic demo route: ~20 waypoints between two points
function buildRoute(): { lat: number; lng: number }[] {
  const start = { lat: 18.5204, lng: 73.8567 };
  const end = { lat: 19.9975, lng: 73.7898 };
  const n = 24;
  return Array.from({ length: n }, (_, i) => ({
    lat: start.lat + ((end.lat - start.lat) * i) / (n - 1),
    lng: start.lng + ((end.lng - start.lng) * i) / (n - 1),
  }));
}

const initialShipments: Shipment[] = [
  {
    id: "SHP-047",
    product: "Influenza vaccine (cold-chain Class II)",
    origin: "Pune Pharma Hub",
    destination: "Nashik Regional Depot",
    startedAt: Date.now() - 1000 * 60 * 8,
    status: "in-transit",
    route: buildRoute(),
    upperLimit: 8,
    lowerLimit: 2,
  },
  {
    id: "SHP-046",
    product: "mRNA booster (Class II)",
    origin: "Pune Pharma Hub",
    destination: "Mumbai Central Depot",
    startedAt: Date.now() - 1000 * 60 * 60 * 4,
    status: "delivered",
    route: buildRoute(),
    upperLimit: 8,
    lowerLimit: 2,
    blockchainTx: "0x8f3a1b9c4e2d7f6a5b9c0e1d2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
  },
];

interface State {
  role: Role | null;
  shipments: Shipment[];
  selectedShipmentId: string;
  readings: Record<string, Reading[]>;
  alerts: AlertEvent[];
  simulatorRunning: boolean;
  speed: 1 | 5 | 10;
  injectFlag: boolean;
  toasts: { id: string; kind: "ok" | "breach" | "info"; msg: string }[];

  setRole: (r: Role | null) => void;
  selectShipment: (id: string) => void;
  setSpeed: (s: 1 | 5 | 10) => void;
  startSim: () => void;
  stopSim: () => void;
  injectBreach: () => void;
  resetShipment: () => void;
  pushReading: (r: Reading) => void;
  pushAlert: (a: AlertEvent) => void;
  pushToast: (kind: "ok" | "breach" | "info", msg: string) => void;
  dismissToast: (id: string) => void;
  computeBatchHash: (id: string) => Promise<string>;
}

export const useStore = create<State>((set, get) => ({
  role: null,
  shipments: initialShipments,
  selectedShipmentId: "SHP-047",
  readings: { "SHP-047": [], "SHP-046": [] },
  alerts: [],
  simulatorRunning: false,
  speed: 1,
  injectFlag: false,
  toasts: [],

  setRole: (r) => {
    if (typeof window !== "undefined") {
      if (r) localStorage.setItem("role", r);
      else localStorage.removeItem("role");
    }
    set({ role: r });
  },
  selectShipment: (id) => set({ selectedShipmentId: id }),
  setSpeed: (s) => set({ speed: s }),
  startSim: () => set({ simulatorRunning: true }),
  stopSim: () => set({ simulatorRunning: false }),
  injectBreach: () => set({ injectFlag: true }),
  resetShipment: () => {
    const id = get().selectedShipmentId;
    set((s) => ({
      readings: { ...s.readings, [id]: [] },
      alerts: s.alerts.filter((a) => a.shipmentId !== id),
    }));
  },
  pushReading: (r) =>
    set((s) => ({
      readings: { ...s.readings, [r.shipmentId]: [...(s.readings[r.shipmentId] ?? []), r] },
    })),
  pushAlert: (a) => set((s) => ({ alerts: [a, ...s.alerts] })),
  pushToast: (kind, msg) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, kind, msg }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  computeBatchHash: async (id) => {
    const rows = get().readings[id] ?? [];
    return sha256Hex(rows.map((r) => r.rowHash).join(""));
  },
}));

export { GENESIS, computeRowHash };
