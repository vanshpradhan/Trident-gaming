import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "customer";
  redirectTo?: string;
}

export function ProtectedRoute({ children, requiredRole, redirectTo }: ProtectedRouteProps) {
  const { isLoggedIn, isAdmin, loading } = useAuth();

  if (loading) return null;

  // Admin-only route
  if (requiredRole === "admin") {
    if (!isLoggedIn || !isAdmin) {
      return <Navigate to={redirectTo || "/"} replace />;
    }
  }

  // Customer-only route — redirect admin to /admin
  if (requiredRole === "customer") {
    if (isLoggedIn && isAdmin) {
      return <Navigate to={redirectTo || "/admin"} replace />;
    }
  }

  return <>{children}</>;
}
