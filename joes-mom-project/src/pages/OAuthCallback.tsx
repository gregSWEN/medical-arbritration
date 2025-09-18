// src/pages/OAuthCallback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function OAuthCallback() {
  const nav = useNavigate();
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    const r = url.searchParams.get("r") || "/home";
    if (token) {
      localStorage.setItem("token", token);
    }
    nav(r, { replace: true });
  }, [nav]);
  return <div className="p-6 text-slate-600">Signing you in…</div>;
}
