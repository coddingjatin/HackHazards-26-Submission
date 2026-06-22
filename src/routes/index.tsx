import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ColdChain — Sign in" },
      { name: "description", content: "Cold-chain compliance logger: monitor, alert, and audit pharma shipments end-to-end." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const setRole = useStore((s) => s.setRole);

  const pick = (r: Role) => {
    setRole(r);
    navigate({ to: r === "driver" ? "/driver" : r === "manager" ? "/manager" : "/regulator" });
  };

  const roles: { id: Role; title: string; desc: string; icon: string }[] = [
    { id: "driver", title: "Driver", desc: "Simple in-truck status display", icon: "🚚" },
    { id: "manager", title: "Manager", desc: "Live dashboard, alerts & reports", icon: "📊" },
    { id: "regulator", title: "Regulator", desc: "Read-only audit & on-chain verify", icon: "🛡️" },
  ];

  return (
    <div className="bg-background min-h-screen">
      <div className="bg-navy text-navy-foreground py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="bg-success/90 mx-auto mb-4 flex size-12 items-center justify-center rounded-xl text-2xl">
            ❄
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">ColdChain Compliance Logger</h1>
          <p className="mt-3 text-navy-foreground/70">
            Tamper-proof temperature monitoring for pharma & food logistics — live alerts, predictive breach detection, blockchain-anchored audit trail.
          </p>
        </div>
      </div>
      <main className="mx-auto -mt-10 max-w-4xl px-4 pb-16">
        <div className="bg-card rounded-2xl border shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">Select your role</h2>
            <p className="text-muted-foreground text-sm">Demo mode — one-click sign-in.</p>
          </div>
          <div className="grid gap-3 p-6 md:grid-cols-3">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => pick(r.id)}
                className="hover:border-primary group flex flex-col items-start gap-3 rounded-xl border bg-background p-5 text-left transition hover:shadow-md"
              >
                <div className="bg-secondary group-hover:bg-primary/10 flex size-11 items-center justify-center rounded-lg text-2xl">
                  {r.icon}
                </div>
                <div>
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-muted-foreground text-sm">{r.desc}</div>
                </div>
                <span className="text-primary mt-auto text-sm font-medium">Continue →</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
