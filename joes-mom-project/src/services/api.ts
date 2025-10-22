// src/services/api.ts
const BASE_URL = import.meta.env.VITE_API_BASE ?? "";

type ApiResult<T = any> = { ok: boolean; message?: string } & T;

export type SignUpPayload = {
  email: string;
  password: string;
  name: string;
  phone: string;
  mailingAddress: string;
};

function authHeaders() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : { Authorization: `` };
}
// async function http<T>(path: string, opts: RequestInit = {}): Promise<T> {
//   const res = await fetch(`${BASE_URL}${path}`, {
//     ...opts,
//     headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
//   });
//   if (!res.ok) throw new Error(`HTTP ${res.status}`);
//   return res.json() as Promise<T>;
// }

export type WorkflowStatus =
  | "submitted"
  | "in_review"
  | "resolved"
  | "rejected";
export type Phase = "Pending" | "Grace Period" | "Missed" | "Expired";

export type ListFilters = {
  submittedFrom?: string; // YYYY-MM-DD
  submittedTo?: string; // YYYY-MM-DD
  doctor?: string;
  insurance?: string;
  cpt?: string;
  claimNo?: string;
  phase?: Phase;
  workflowStatus?: WorkflowStatus;
  limit?: number;
};
function qs(params: Record<string, any>) {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") u.append(k, String(v));
  });
  return `?${u.toString()}`;
}

export async function me() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
  const json = await res.json();
  return json;
}

export const api = {
  // add this function

  async login(
    email: string,
    password: string
  ): Promise<ApiResult<{ token: string }>> {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    return json;
  },

  // ⬇️ extend to accept optional profile
  async register(
    email: string,
    password: string,
    profile?: { name: string; phone: string; mailingAddress: string }
  ): Promise<ApiResult> {
    const body = {
      email,
      password,
      ...(profile || {}),
    };
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return json;
  },

  async getCurrentlyLoggedInUser(): Promise<
    | ApiResult<{ user: any; needsProfile: boolean }>
    | { ok: false; message: string }
  > {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      return json;
    } catch (error) {
      return { ok: false, message: "Failed to fetch user" };
    }
  },
  async completeProfile(body: {
    name: string;
    phone: string;
    mailingAddress: string;
    templateGoogleDocId: string;
  }) {
    const token = localStorage.getItem("token");
    const url = `${BASE_URL}/api/auth/complete-profile`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return json;
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
  async createSubmission(payload: any) {
    const res = await fetch(`${BASE_URL}/api/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || json.ok === false) {
      throw new Error(json?.message || `Create failed (${res.status})`);
    }
    return json as { ok: true; submission: any };
  },

  async generateSubmissionPdf(id: string, templateDriveFileId: string) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/api/submissions/${id}/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ templateDriveFileId }),
    });
    const json = await res.json(); // <— await
    if (!res.ok) throw new Error(json?.message || "PDF generation failed");
    return json as { ok: true; url: string; filename: string };
  },

  async downloadSubmissionPdf(id: string) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/api/submissions/${id}/pdf`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || "Download failed");
    }
    return await res.blob();
  },

  async emailSubmission(id: string) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/api/submissions/${id}/email`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const json = await res.json(); // <— await
    if (!res.ok) throw new Error(json?.message || "Email failed");
    return json as { ok: true; message: string };
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
