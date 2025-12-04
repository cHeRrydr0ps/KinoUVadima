import { PropsWithChildren, useEffect, useMemo } from "react";
import { useLocation } from "wouter";

import { useAuth } from "@/hooks/useAuth";

export type ProtectedRouteProps = {
  redirectTo?: string;
  allowedRoles?: string[];
};

export function ProtectedRoute({
  children,
  redirectTo = "/",
  allowedRoles,
}: PropsWithChildren<ProtectedRouteProps>) {
  const { isAuthenticated, loading, user } = useAuth();
  const [location, setLocation] = useLocation();

  const hasRoleAccess = useMemo(() => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    const role = (user?.role ?? "").toLowerCase();
    return allowedRoles.some((allowed) => allowed.toLowerCase() === role);
  }, [allowedRoles, user?.role]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !hasRoleAccess) {
      if (location !== redirectTo) {
        setLocation(redirectTo);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:open"));
      }
    }
  }, [hasRoleAccess, isAuthenticated, loading, location, redirectTo, setLocation]);

  if (loading) {
    return <div className="py-32 text-center text-zinc-400">Checking access...</div>;
  }

  if (!isAuthenticated || !hasRoleAccess) {
    return null;
  }

  return <>{children}</>;
}
