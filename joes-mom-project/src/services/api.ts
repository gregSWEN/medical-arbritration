import type { Submission, ApiCreateSubmissionResponse } from "@/types";

// Swap BASE_URL for your server when ready (e.g., from VITE_API_URL)
const BASE_URL = import.meta.env.VITE_API_URL ?? "";

async function http<T>(path: string, opts: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  // POST /api/submissions — server should: validate, store, email insurer, schedule follow-up email
  createSubmission(payload: Submission) {
    // TEMP: mock a server response so the UI is immediately usable
    if (!BASE_URL) {
      return Promise.resolve<ApiCreateSubmissionResponse>({
        ok: true,
        message:
          "✅ Submission accepted (mock). Insurer email will be sent by server. Follow-up scheduled for 30 business days.",
        documentUrl: undefined,
      });
    }
    return http<ApiCreateSubmissionResponse>("/api/submissions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
