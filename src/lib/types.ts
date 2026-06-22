export type Role = "driver" | "manager" | "regulator";

export type ReadingStatus = "ok" | "warning" | "breach";

export interface Reading {
  id: number;
  shipmentId: string;
  ts: number; // epoch ms
  temp: number;
  sensorId: string;
  lat: number;
  lng: number;
  status: ReadingStatus;
  prevHash: string;
  rowHash: string;
}

export interface AlertEvent {
  id: string;
  shipmentId: string;
  ts: number;
  kind: "breach" | "restored" | "predicted" | "dispatch";
  message: string;
}

export interface Shipment {
  id: string;
  product: string;
  origin: string;
  destination: string;
  startedAt: number;
  status: "in-transit" | "delivered" | "review";
  route: { lat: number; lng: number }[];
  upperLimit: number;
  lowerLimit: number;
  blockchainTx?: string;
}
