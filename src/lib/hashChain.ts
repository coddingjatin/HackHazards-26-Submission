export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeRowHash(
  ts: number,
  temp: number,
  sensorId: string,
  prevHash: string,
): Promise<string> {
  return sha256Hex(`${ts}|${temp.toFixed(3)}|${sensorId}|${prevHash}`);
}

export function truncateHash(h: string, n = 10): string {
  return h.slice(0, n) + "…" + h.slice(-4);
}
