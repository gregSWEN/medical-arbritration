import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/routes/ProtectedRoute";
import SignupPage from "@/pages/SignupPage";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import ArbitrationForm from "@/components/ArbitrationForm";
import SubmissionsPage from "@/pages/SubmissionsPage";

function FullPageSpinner() {
  return <div className="min-h-screen grid place-items-center">Loading…</div>;
}

export default function App() {
  const { token, ready } = useAuth();
  if (!ready) return <FullPageSpinner />;

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={token ? "/home" : "/login"} replace />}
      />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/form" element={<ArbitrationForm />} />
        <Route path="/submissions" element={<SubmissionsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
