import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";

export function TopBar({ title }: { title: string }) {
  const role = useStore((s) => s.role);
  const setRole = useStore((s) => s.setRole);
  const navigate = useNavigate();

  return (
    <header className="bg-navy text-navy-foreground sticky top-0 z-40 border-b border-black/20">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-success/90" />
            <span className="font-semibold tracking-tight">ColdChain</span>
            <span className="text-navy-foreground/60 hidden text-sm sm:inline">/ {title}</span>
          </div>
          {role === "manager" && (
            <nav className="hidden gap-1 text-sm md:flex">
              <NavLink to="/manager">Dashboard</NavLink>
              <NavLink to="/reports">Reports</NavLink>
              <NavLink to="/audit">Audit log</NavLink>
            </nav>
          )}
          {role === "regulator" && (
            <nav className="hidden gap-1 text-sm md:flex">
              <NavLink to="/regulator">Shipments</NavLink>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs uppercase tracking-wide">
            {role}
          </span>
          <button
            onClick={() => {
              setRole(null);
              navigate({ to: "/" });
            }}
            className="hover:bg-white/10 rounded-md px-3 py-1.5 text-sm transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-1.5 hover:bg-white/10"
      activeProps={{ className: "rounded-md px-3 py-1.5 bg-white/15 font-medium" }}
    >
      {children}
    </Link>
  );
}
