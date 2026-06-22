import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import type { Reading, Shipment } from "./types";
import { truncateHash } from "./hashChain";

export async function generateCompliancePDF(
  shipment: Shipment,
  readings: Reading[],
  chartPng: string | null,
  txHash: string,
) {
  const doc = new jsPDF();
  const breaches = readings.filter((r) => r.status === "breach");
  const okPct = readings.length
    ? Math.round(((readings.length - breaches.length) / readings.length) * 100)
    : 100;

  // Header
  doc.setFillColor(34, 47, 90);
  doc.rect(0, 0, 210, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("ColdChain Compliance Report", 14, 15);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 196, 15, { align: "right" });

  // Metadata
  doc.setTextColor(20, 20, 30);
  doc.setFontSize(12);
  doc.text(`Shipment ${shipment.id}`, 14, 34);
  autoTable(doc, {
    startY: 38,
    theme: "plain",
    styles: { fontSize: 9 },
    body: [
      ["Product", shipment.product],
      ["Origin", shipment.origin],
      ["Destination", shipment.destination],
      ["Safe range", `${shipment.lowerLimit}°C – ${shipment.upperLimit}°C`],
      ["Readings", String(readings.length)],
      ["Breaches", String(breaches.length)],
      ["Compliance", `${okPct}%`],
      ["Status", breaches.length === 0 ? "COMPLIANT" : "REVIEW REQUIRED"],
    ],
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  if (chartPng) {
    doc.setFontSize(11);
    doc.text("Temperature trace", 14, y);
    doc.addImage(chartPng, "PNG", 14, y + 2, 182, 60);
    y += 68;
  }

  // Breach summary
  doc.setFontSize(11);
  doc.text("Breach summary", 14, y);
  if (breaches.length === 0) {
    doc.setFontSize(9);
    doc.text("No threshold breaches recorded.", 14, y + 6);
    y += 12;
  } else {
    autoTable(doc, {
      startY: y + 2,
      head: [["#", "Time", "Temp °C", "Sensor", "GPS"]],
      body: breaches.map((r) => [
        r.id,
        new Date(r.ts).toLocaleTimeString(),
        r.temp.toFixed(2),
        r.sensorId,
        `${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 47, 90] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // Audit log (paginated by autoTable)
  doc.addPage();
  doc.setFontSize(12);
  doc.text("Full audit log (hash-chained)", 14, 16);
  autoTable(doc, {
    startY: 20,
    head: [["#", "Time", "Temp", "Status", "Hash"]],
    body: readings.map((r) => [
      r.id,
      new Date(r.ts).toLocaleTimeString(),
      r.temp.toFixed(2),
      r.status.toUpperCase(),
      truncateHash(r.rowHash, 14),
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [34, 47, 90] },
  });

  // QR + signature
  doc.addPage();
  doc.setFontSize(12);
  doc.text("On-chain verification", 14, 16);
  const txUrl = `https://polygonscan.com/tx/${txHash}`;
  const qr = await QRCode.toDataURL(txUrl, { margin: 1, width: 200 });
  doc.addImage(qr, "PNG", 14, 22, 50, 50);
  doc.setFontSize(9);
  doc.text("Scan to verify the batch hash on Polygon:", 70, 32);
  doc.text(txUrl, 70, 40, { maxWidth: 130 });

  doc.setFontSize(10);
  doc.text("Digital signature", 14, 110);
  doc.line(14, 124, 110, 124);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 130);
  doc.text("Authorized cold-chain QA representative", 14, 130);

  doc.save(`${shipment.id}-compliance.pdf`);
}
