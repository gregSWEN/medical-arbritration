// src/pages/ProfileSetupPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";

export default function ProfileSetupPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await api.completeProfile({ name, phone, mailingAddress });
      if (!res.ok) throw new Error(res.message || "Failed");
      nav("/home", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow"
      >
        <h1 className="text-2xl font-bold">Complete your profile</h1>
        <p className="text-sm text-slate-600">
          We need a few details to populate your documents and emails.
        </p>

        <div>
          <label className="text-sm font-medium">Full Name</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Phone</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Mailing Address</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            rows={3}
            value={mailingAddress}
            onChange={(e) => setMailingAddress(e.target.value)}
            required
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
          {busy ? "Saving…" : "Save and continue"}
        </button>
      </form>
    </div>
  );
}
