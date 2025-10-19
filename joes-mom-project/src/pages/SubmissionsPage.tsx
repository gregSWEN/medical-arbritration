// src/pages/SubmissionsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { api, ListFilters, Phase, WorkflowStatus } from "@/services/api";
import StatusBadge from "@/components/StatusBadge";
import type { Submission } from "@/types/index";

const fmtUSD = (n: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const phaseOptions: ("" | Phase)[] = [
  "",
  "Pending",
  "Grace Period",
  "Missed",
  "Expired",
];
const workflowStatusOptions: ("" | WorkflowStatus)[] = [
  "",
  "submitted",
  "in_review",
  "resolved",
  "rejected",
];

export default function SubmissionsPage() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [submittedFrom, setSubmittedFrom] = useState<string>("");
  const [submittedTo, setSubmittedTo] = useState<string>("");
  const [doctor, setDoctor] = useState<string>("");
  const [insurance, setInsurance] = useState<string>("");
  const [cpt, setCpt] = useState<string>("");
  const [claimNo, setClaimNo] = useState<string>("");

  // NOTE: use union types (undefined = "no filter" rather than empty string)
  const [phase, setPhase] = useState<Phase | undefined>(undefined);
  const [workflowStatus, setWorkflowStatus] = useState<
    WorkflowStatus | undefined
  >(undefined);

  const [limit, setLimit] = useState<number>(50);

  async function load() {
    setLoading(true);
    setErr(null);
    const filters: ListFilters = {
      submittedFrom,
      submittedTo,
      doctor,
      insurance,
      cpt,
      claimNo,
      phase,
      workflowStatus,
      limit,
    };
    try {
      const data = await api.listSubmissions(filters);
      setRows((data.items || []) as Submission[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearFilters() {
    setSubmittedFrom("");
    setSubmittedTo("");
    setDoctor("");
    setInsurance("");
    setCpt("");
    setClaimNo("");
    setPhase(undefined);
    setWorkflowStatus(undefined);
    setLimit(50);
    setTimeout(load, 0);
  }

  async function onExport() {
    const filters: ListFilters = {
      submittedFrom,
      submittedTo,
      doctor,
      insurance,
      cpt,
      claimNo,
      phase,
      workflowStatus,
    };
    try {
      await api.exportSubmissionsCsv(filters);
    } catch (e: any) {
      alert(e?.message || "Export failed");
    }
  }

  const sortedRows = useMemo(() => {
    const order = {
      Missed: 0,
      "Grace Period": 1,
      Pending: 2,
      Expired: 3,
      "": 4,
    } as Record<string, number>;
    return [...rows].sort((a, b) => {
      const ao = order[a.phase || ""] ?? 4;
      const bo = order[b.phase || ""] ?? 4;
      if (ao !== bo) return ao - bo;
      const ae = a.phaseEndIso ? new Date(a.phaseEndIso).getTime() : Infinity;
      const be = b.phaseEndIso ? new Date(b.phaseEndIso).getTime() : Infinity;
      return ae - be;
    });
  }, [rows]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Recent Submissions</h1>

      {/* Filters */}
      <div className="rounded-xl bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-8">
          <div>
            <label className="text-xs font-medium">Submitted From</label>
            <input
              type="date"
              className="mt-1 w-full rounded border px-2 py-1"
              value={submittedFrom}
              onChange={(e) => setSubmittedFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Submitted To</label>
            <input
              type="date"
              className="mt-1 w-full rounded border px-2 py-1"
              value={submittedTo}
              onChange={(e) => setSubmittedTo(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Doctor</label>
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              placeholder="Dr. Name"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Insurance</label>
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              placeholder="AETNA"
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">CPT</label>
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              placeholder="95937"
              value={cpt}
              onChange={(e) => setCpt(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Claim #</label>
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              placeholder="CLM-"
              value={claimNo}
              onChange={(e) => setClaimNo(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Phase</label>
            <select
              className="mt-1 w-full rounded border px-2 py-1"
              value={phase ?? ""}
              onChange={(e) =>
                setPhase(
                  e.target.value === "" ? undefined : (e.target.value as Phase)
                )
              }
            >
              {phaseOptions.map((p) => (
                <option key={p || "(Any)"} value={p}>
                  {p || "(Any)"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Workflow</label>
            <select
              className="mt-1 w-full rounded border px-2 py-1"
              value={workflowStatus ?? ""}
              onChange={(e) =>
                setWorkflowStatus(
                  e.target.value === ""
                    ? undefined
                    : (e.target.value as WorkflowStatus)
                )
              }
            >
              {workflowStatusOptions.map((w) => (
                <option key={w || "(Any)"} value={w}>
                  {w || "(Any)"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={load}
            className="rounded bg-sky-600 px-3 py-2 text-white hover:bg-sky-700"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="rounded bg-slate-100 px-3 py-2"
          >
            Clear
          </button>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-slate-600">Limit</label>
            <select
              className="rounded border px-2 py-1"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option>25</option>
              <option>50</option>
              <option>200</option>
              <option value={1000}>1000</option>
            </select>
            <button
              onClick={onExport}
              className="rounded bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white p-6 shadow">
        {loading ? (
          <div>Loading…</div>
        ) : err ? (
          <div className="text-red-700">{err}</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2">Submitted</th>
                  <th className="px-3 py-2">Claim #</th>
                  <th className="px-3 py-2">Insurance</th>
                  <th className="px-3 py-2">Doctor</th>
                  <th className="px-3 py-2">Billed</th>
                  <th className="px-3 py-2">Paid</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Phase</th>
                  <th className="px-3 py-2">CPTs</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr key={r._id} className="border-t align-top">
                    <td className="px-3 py-2">
                      {new Date(r.dateSubmittedIso).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{r.claimNo}</td>
                    <td className="px-3 py-2">{r.insurance}</td>
                    <td className="px-3 py-2">{r.doctor}</td>
                    <td className="px-3 py-2">
                      {fmtUSD(r.totals?.billed ?? 0)}
                    </td>
                    <td className="px-3 py-2">{fmtUSD(r.totals?.paid ?? 0)}</td>
                    <td className="px-3 py-2">
                      {new Date(r.dueDateIso).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge phase={r.phase} />
                        {r.phaseEndIso ? (
                          <span className="text-xs text-slate-500">
                            ends {new Date(r.phaseEndIso).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {(r.cpts ?? []).map((c, i) => (
                        <span
                          key={i}
                          className="mr-2 inline-block rounded bg-slate-100 px-2 py-0.5"
                        >
                          {c.code}×{c.count} (${c.initialPayment})
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
                {sortedRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-6 text-center text-slate-500"
                    >
                      No results.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
