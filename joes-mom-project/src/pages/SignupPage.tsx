// src/pages/SignupPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const nav = useNavigate();
  const { registerThenLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // NEW fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!name.trim() || !phone.trim() || !mailingAddress.trim()) {
      setErr("Please fill in name, phone, and mailing address.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      await registerThenLogin(email.trim(), password, {
        name: name.trim(),
        phone: phone.trim(),
        mailingAddress: mailingAddress.trim(),
      });
      nav("/home", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Failed");
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
        <h1 className="text-2xl font-bold">Create your account</h1>

        {/* NEW fields */}
        <div>
          <label className="text-sm font-medium">Full Name</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            required
            autoComplete="name"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Phone</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 555-1234"
            required
            autoComplete="tel"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Mailing Address</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={mailingAddress}
            onChange={(e) => setMailingAddress(e.target.value)}
            placeholder="140 ADAMS AVE. SUITE B-13, HAUPPAUGE, NY 11788"
            rows={3}
            required
          />
        </div>

        {/* Existing fields */}
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@clinic.com"
            required
            autoComplete="email"
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
            autoComplete="new-password"
          />
          <p className="text-xs text-slate-500 mt-1">Min 8 characters.</p>
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
          {busy ? "Creating…" : "Create account"}
        </button>

        <p className="text-xs text-slate-500">
          Already have an account?{" "}
          <a
            className="text-sky-700 underline"
            onClick={(e) => {
              e.preventDefault();
              nav("/login");
            }}
            href=""
          >
            Sign in
          </a>
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
