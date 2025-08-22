// src/services/api.ts
const BASE_URL = import.meta.env.VITE_API_URL ?? "";

async function http<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

type ListFilters = {
  submittedFrom?: string; // YYYY-MM-DD
  submittedTo?: string; // YYYY-MM-DD
  doctor?: string;
  insurance?: string;
  cpt?: string;
  claimNo?: string;
  limit?: number;
};

function qs(params: Record<string, any>) {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") u.append(k, String(v));
  });
  return `?${u.toString()}`;
}

export const api = {
  // add this function

  async register(email: string, password: string) {
    return http<{ ok: boolean; id?: string; message?: string }>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
  },
  async listSubmissions(filters: ListFilters = {}) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${BASE_URL}/api/submissions${qs(filters)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Promise<{ items: any[] }>;
  },
  // existing createSubmission, login, register...
  async login(email: string, password: string) {
    return http<{ ok: boolean; token?: string; message?: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
  },
  async createSubmission(payload: any) {
    const token = localStorage.getItem("token") || ""; // Change to be an http only token
    return http<{ ok: boolean; message: string; documentUrl?: string }>(
      "/api/submissions",
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },
  async exportSubmissionsCsv(filters: ListFilters = {}) {
    const token = localStorage.getItem("token") || "";
    const res = await fetch(
      `${BASE_URL}/api/submissions/export${qs(filters)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submissions_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
