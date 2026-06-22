import { createFileRoute } from "@tanstack/react-router";
import { snapshot, tick } from "@/lib/sim-state.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/readings/$shipmentId")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const since = Number(url.searchParams.get("since") ?? 0);
        await tick(params.shipmentId);
        const snap = snapshot(params.shipmentId, since);
        return new Response(JSON.stringify(snap), {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
        });
      },
    },
  },
});
