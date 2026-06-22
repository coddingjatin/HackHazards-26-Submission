import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export function RoleGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const role = useStore((s) => s.role);
  const setRole = useStore((s) => s.setRole);
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  // Hydrate role from localStorage on the client only
  useEffect(() => {
    if (!role && typeof window !== "undefined") {
      const stored = localStorage.getItem("role") as Role | null;
      if (stored) setRole(stored);
    }
    setMounted(true);
  }, [role, setRole]);

  useEffect(() => {
    if (!mounted) return;
    if (!role || !allow.includes(role)) navigate({ to: "/" });
  }, [mounted, role, allow, navigate]);

  if (!mounted) return null;
  if (!role || !allow.includes(role)) return null;
  return <>{children}</>;
}
