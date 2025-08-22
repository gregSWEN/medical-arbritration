import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function FullPageSpinner() {
  return <div className="min-h-screen grid place-items-center">Loading…</div>;
}

export default function ProtectedRoute() {
  const { token, ready } = useAuth();
  if (!ready) return <FullPageSpinner />;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
