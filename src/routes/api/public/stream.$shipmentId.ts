import { createFileRoute } from "@tanstack/react-router";
import { snapshot, tick, getState } from "@/lib/sim-state.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/stream/$shipmentId")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const since0 = Number(url.searchParams.get("since") ?? 0);
        const shipmentId = params.shipmentId;
        const encoder = new TextEncoder();

        let lastTs = since0;
        let currentResetAt = 0;
        let closed = false;
        const signal = request.signal;
        signal.addEventListener("abort", () => {
          closed = true;
        });

        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: string, data: unknown) => {
              if (closed) return;
              try {
                controller.enqueue(
                  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
                );
              } catch {
                closed = true;
              }
            };

            // initial snapshot
            await tick(shipmentId);
            const initial = snapshot(shipmentId, lastTs);
            currentResetAt = initial.resetAt;
            if (initial.readings.length) lastTs = initial.readings[initial.readings.length - 1].ts;
            send("snapshot", initial);

            // tick loop
            const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
            // hard cap to ~5 min per connection so workers don't hold streams forever
            const startedAt = Date.now();
            while (!closed && Date.now() - startedAt < 5 * 60_000) {
              const s = getState(shipmentId);
              const intervalMs = Math.max(400, 2000 / s.speed);
              await sleep(intervalMs);
              if (closed) break;
              await tick(shipmentId);

              const state = getState(shipmentId);
              if (state.resetAt !== currentResetAt) {
                lastTs = 0;
                currentResetAt = state.resetAt;
                const snap = snapshot(shipmentId, 0);
                if (snap.readings.length) lastTs = snap.readings[snap.readings.length - 1].ts;
                send("snapshot", snap);
                continue;
              }

              const diff = snapshot(shipmentId, lastTs);
              if (diff.readings.length) {
                lastTs = diff.readings[diff.readings.length - 1].ts;
              }
              send("delta", diff);
            }
            try {
              controller.close();
            } catch {
              /* already closed */
            }
          },
          cancel() {
            closed = true;
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
            ...CORS,
          },
        });
      },
    },
  },
});
