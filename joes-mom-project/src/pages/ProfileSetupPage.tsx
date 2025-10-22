// src/pages/ProfileSetupPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

// accept full link OR raw id
function extractDriveId(input: string): string | null {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]{20,})/,
    /[?&]id=([a-zA-Z0-9_-]{20,})/,
    /\/file\/d\/([a-zA-Z0-9_-]{20,})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export default function ProfileSetupPage() {
  const { token } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [templateLink, setTemplateLink] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // NEW: track initial fetched values to know if this is first time
  const [loaded, setLoaded] = useState(false);
  const [initialHasProfile, setInitialHasProfile] = useState(false);

  // NEW: snackbar state
  const [snack, setSnack] = useState<string | null>(null);
  useEffect(() => {
    if (!snack) return;
    const t = setTimeout(() => setSnack(null), 3500);
    return () => clearTimeout(t);
  }, [snack]);

  useEffect(() => {
    async function fetchUser() {
      if (!token) return;
      const res = await api.getCurrentlyLoggedInUser();
      if (res?.ok) {
        const n = res.user.name || "";
        const p = res.user.phone || "";
        const a = res.user.mailingAddress || "";
        const t = res.user.templateGoogleDocId || ""; // keep same field name end-to-end

        setName(n);
        setPhone(p);
        setMailingAddress(a);
        setTemplateLink(t);

        const hasAll = !!(n && p && a && t);
        setInitialHasProfile(hasAll);
        setLoaded(true);
      } else {
        setLoaded(true);
      }
    }
    fetchUser();
  }, [token]);

  const isFirstTime = useMemo(
    () => loaded && !initialHasProfile,
    [loaded, initialHasProfile]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const templateGoogleDocId = extractDriveId(templateLink);
      if (!templateGoogleDocId)
        throw new Error("Please paste a valid Google Doc link or file ID.");

      const res = await api.completeProfile({
        name: name.trim(),
        phone: phone.trim(),
        mailingAddress: mailingAddress.trim(),
        templateGoogleDocId: templateGoogleDocId.trim(),
      });
      if (!res.ok) throw new Error(res.message || "Failed");

      // success snackbar copy varies by first-time vs update
      setSnack(
        isFirstTime
          ? "Your profile is completed. You may return to the arbitration form."
          : "Profile updated successfully."
      );

      // if they came from a protected page, show success then bounce back quickly
      const params = new URLSearchParams(loc.search);
      const ret = params.get("return");
      if (ret) {
        setTimeout(() => nav(ret, { replace: true }), 900); // brief moment so they catch the toast
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to save profile");
    } finally {
      setBusy(false);
    }
  }

  const title = isFirstTime ? "Complete your profile" : "Update your profile";
  const subtitle = isFirstTime
    ? "We need a few details to populate your documents and emails."
    : "Update your details used to generate documents and emails.";
  const buttonLabel = busy
    ? "Saving…"
    : isFirstTime
    ? "Save and continue"
    : "Save changes";

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow"
      >
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-slate-600">{subtitle}</p>

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

        <div>
          <label className="text-sm font-medium">
            Arbitration Template (Google Doc link)
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Paste your Google Doc URL (e.g. https://docs.google.com/...)"
            value={templateLink}
            onChange={(e) => setTemplateLink(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            We’ll securely store the file ID and use it to generate your PDFs.
          </p>
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
          {buttonLabel}
        </button>
      </form>

      {/* Snackbar */}
      {snack && <SnackBar message={snack} />}
    </div>
  );
}

function SnackBar({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 text-white shadow-lg px-4 py-3 text-sm"
    >
      {message}
    </div>
  );
}
