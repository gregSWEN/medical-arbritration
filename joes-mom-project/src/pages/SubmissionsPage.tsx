// src/pages/SubmissionsPage.tsx
import { useEffect, useState } from "react";
import { api } from "@/services/api";

type Row = {
  _id: string;
  claimNo: string;
  insurance: string;
  doctor: string;
  patientName: string;
  dateSubmittedIso: string;
  dueDateIso: string;
  totals: { billed: number; paid: number };
  cpts?: { code: string; count: number; initialPayment: number }[];
};

const fmtUSD = (n: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function SubmissionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [submittedFrom, setSubmittedFrom] = useState<string>("");
  const [submittedTo, setSubmittedTo] = useState<string>("");
  const [doctor, setDoctor] = useState<string>("");
  const [insurance, setInsurance] = useState<string>("");
  const [cpt, setCpt] = useState<string>("");
  const [claimNo, setClaimNo] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await api.listSubmissions({
        submittedFrom,
        submittedTo,
        doctor,
        insurance,
        cpt,
        claimNo,
        limit,
      });
      setRows(data.items ?? []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); /* initial */
  }, []);

  async function onExport() {
    try {
      await api.exportSubmissionsCsv({
        submittedFrom,
        submittedTo,
        doctor,
        insurance,
        cpt,
        claimNo,
        limit: 100000,
      });
    } catch (e: any) {
      alert(e?.message || "Export failed");
    }
  }

  return (
    <div className="min-h-screen bg-sky-50 p-6">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Recent Submissions</h1>
          <a href="/home" className="text-sky-700 underline">
            Back to Home
          </a>
        </div>

        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-6">
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
        </div>

        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={load}
            className="rounded bg-sky-600 px-3 py-2 text-white hover:bg-sky-700"
          >
            Apply Filters
          </button>
          <button
            onClick={() => {
              setSubmittedFrom("");
              setSubmittedTo("");
              setDoctor("");
              setInsurance("");
              setCpt("");
              setClaimNo("");
              setLimit(50);
              load();
            }}
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

        {/* Table */}
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
                  <th className="px-3 py-2">CPTs</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-t">
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
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
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
