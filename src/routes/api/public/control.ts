import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { injectBreach, resetShipment, setSpeed, snapshot, startSim, stopSim, tick } from "@/lib/sim-state.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const Body = z.object({
  shipmentId: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  action: z.enum(["inject", "reset", "speed", "start", "stop"]),
  speed: z.union([z.literal(1), z.literal(5), z.literal(10)]).optional(),
});

export const Route = createFileRoute("/api/public/control")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return new Response(JSON.stringify({ error: "invalid body" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
        if (parsed.action === "inject") injectBreach(parsed.shipmentId);
        else if (parsed.action === "reset") resetShipment(parsed.shipmentId);
        else if (parsed.action === "start") startSim(parsed.shipmentId);
        else if (parsed.action === "stop") stopSim(parsed.shipmentId);
        else if (parsed.action === "speed" && parsed.speed) setSpeed(parsed.shipmentId, parsed.speed);
        await tick(parsed.shipmentId);
        return new Response(JSON.stringify({ ok: true, state: snapshot(parsed.shipmentId, 0) }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS },
        });
      },
    },
  },
});
