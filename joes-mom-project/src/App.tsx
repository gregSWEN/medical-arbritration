import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/routes/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import OAuthCallback from "./pages/OAuthCallback";
import HomePage from "@/pages/HomePage";
import ArbitrationForm from "@/components/ArbitrationForm";
import SubmissionsPage from "@/pages/SubmissionsPage";
import AppLayout from "@/layouts/AppLayout";
import OAuthLanding from "./pages/OAuthLanding";
import ProfileSetupPage from "./pages/ProfileSetupPage";
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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route path="/oauth/callback" element={<OAuthLanding />} />

      {/* All protected pages share the same layout + navbar */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/form" element={<ArbitrationForm />} />
          <Route path="/submissions" element={<SubmissionsPage />} />
          <Route path="/profile-setup" element={<ProfileSetupPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
