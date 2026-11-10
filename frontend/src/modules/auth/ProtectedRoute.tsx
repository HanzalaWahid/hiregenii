import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/modules/auth/AuthContext";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

