import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      nav("/home", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow"
      >
        <h1 className="text-2xl font-bold">Sign in</h1>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@clinic.com"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>
        {err && (
          <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
            {err}
          </div>
        )}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-xs text-slate-600">
          No account?{" "}
          <Link className="text-sky-700 underline" to="/signup">
            Create one
          </Link>
        </p>

        <button
          type="button"
          className="w-full rounded-xl bg-white border px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => {
            const r = "/home"; // or stay on current redirect choice
            window.location.href = `${
              import.meta.env.VITE_API_BASE || "http://localhost:5174"
            }/api/auth/google/start?redirect=${encodeURIComponent(r)}`;
          }}
        >
          Continue with Google
        </button>
      </form>
    </div>
  );
}
