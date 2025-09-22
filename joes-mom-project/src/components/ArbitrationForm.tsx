// src/components/ArbitrationForm.tsx
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { INSURERS } from "@/lib/insurers";
import { CPT_PRICE } from "@/lib/cpt";
import { addBusinessDays, toIsoDate } from "@/lib/dates";

import { CPTRow } from "./CPTRow";
import type { Submission } from "@/types";
import { downloadBlob } from "@/lib/pdf";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const schema = z.object({
  id: z.string().min(1, "Required"),
  claimNo: z.string().min(1, "Required"),
  patient: z.string().min(1, "Required"),
  insurance: z.string().min(1, "Required"),
  providerAccountNo: z.string().min(1, "Required"),
  doctor: z.string().min(1, "Required"),
  dateOfService: z.string().min(1, "Required"), // yyyy-MM-dd
  submitterEmail: z.string().email("Valid email required"),
  cpts: z
    .array(
      z.object({
        code: z.string().optional(),
        count: z.number().optional(),
        initialPayment: z.number().optional(),
      })
    )
    .min(1)
    .max(7),
});

export default function ArbitrationForm() {
  const { token, user } = useAuth();
  const [lines, setLines] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  // const [review, setReview] = useState<{
  //   submissionId: string;
  //   filename: string;
  // } | null>(null);
  const [templateDriveFileId, setTemplateDriveFileId] = useState("");
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [afterGenMessage, setAfterGenMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.infer<typeof schema>>({
    defaultValues: {
      id: "",
      claimNo: "",
      patient: "",
      insurance: "",
      providerAccountNo: "",
      doctor: "",
      dateOfService: "",
      submitterEmail: "",
      cpts: Array.from({ length: 1 }, () => ({ count: 1, initialPayment: 0 })),
    },
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  useEffect(() => {
    if (user?.email) {
      setValue("submitterEmail", user.email, { shouldValidate: true });
    }
  }, [user?.email, setValue]);

  const values = watch();

  const totals = useMemo(() => {
    const billed = (values.cpts ?? [])
      .filter((l) => l?.code)
      .reduce((sum, l) => sum + (CPT_PRICE[l.code!] ?? 0) * (l.count ?? 1), 0);
    const paid = (values.cpts ?? []).reduce(
      (sum, l) => sum + (l.initialPayment ?? 0),
      0
    );
    return { billed, paid };
  }, [values.cpts]);

  const dueDateIso = useMemo(
    () => toIsoDate(addBusinessDays(new Date(), 30)),
    []
  );

  // ---------- NEW: Autofill helper for quick testing ----------
  function autofill() {
    const today = new Date().toISOString().slice(0, 10); // yyyy-MM-dd
    const insurer = INSURERS.includes("MERITAIN HEALTH")
      ? "MERITAIN HEALTH"
      : INSURERS[0] || "";

    setLines(3); // create 3 CPT rows
    setValue("id", "DNV-TEST-001", { shouldValidate: true });
    setValue("claimNo", "CLM-123456", { shouldValidate: true });
    setValue("patient", "JOSEPH EXAMPLE", { shouldValidate: true });
    setValue("insurance", insurer, { shouldValidate: true });
    setValue("providerAccountNo", "2398765", { shouldValidate: true });
    setValue("doctor", "Dr. Dhiraj Jeyanandarajan", { shouldValidate: true });
    setValue("dateOfService", today, { shouldValidate: true });
    // submitterEmail comes from auth; leave it

    // CPT rows — adjust as desired
    setValue("cpts.0.code", "G0453");
    setValue("cpts.0.count", 41);
    setValue("cpts.0.initialPayment", 56);

    setValue("cpts.1.code", "96968");
    setValue("cpts.1.count", 1);
    setValue("cpts.1.initialPayment", 100);

    setValue("cpts.2.code", "95937");
    setValue("cpts.2.count", 1);
    setValue("cpts.2.initialPayment", 150);
  }
  // ------------------------------------------------------------

  async function onSubmit(data: z.infer<typeof schema>) {
    setErr(null);
    if (!token) {
      setErr("You must be signed in to submit.");
      return;
    }

    const hasCpt = (data.cpts ?? []).some(
      (l) => (l.code ?? "").trim().length > 0
    );
    if (!hasCpt) {
      setErr("Please enter at least one CPT code.");
      return;
    }

    const cleaned = (data.cpts ?? [])
      .filter((l) => l.code && l.code.trim() !== "")
      .slice(0, 7)
      .map((l) => ({
        code: l.code!.trim(),
        count: Math.max(1, l.count ?? 1),
        initialPayment: Math.max(0, l.initialPayment ?? 0),
      }));

    const payload: Submission = {
      id: data.id.trim().toUpperCase(),
      claimNo: data.claimNo.trim().toUpperCase(),
      patient: data.patient.trim().toUpperCase(),
      insurance: data.insurance,
      providerAccountNo: data.providerAccountNo.trim().toUpperCase(),
      doctor: data.doctor,
      dateOfService: data.dateOfService, // yyyy-MM-dd
      submitterEmail: (user?.email || data.submitterEmail).trim(),
      cpts: cleaned,
      totals, // your memoized totals
      dateSubmittedIso: toIsoDate(new Date()),
      dueDateIso,
    };

    const { api } = await import("@/services/api");
    try {
      // 1) Create submission (server also generates & stores the PDF per your backend)
      const res = await api.createSubmission(payload);

      // TS help: assert the shape we expect
      const created = res?.submission as
        | (Submission & { _id: string })
        | undefined;

      if (!res?.ok || !created?._id) {
        // alert(res?.message || "Submission failed.");
        return;
      }
      // *** Require templateDriveFileId for now ***
      if (!templateDriveFileId) {
        alert("Please paste your Google Drive template file ID.");
        return;
      }

      // 2) Download the stored PDF straight away
      await api.generateSubmissionPdf(created._id, templateDriveFileId);
      const blob = await api.downloadSubmissionPdf(created._id);
      downloadBlob(blob, `${created.claimNo || "negotiation"}.pdf`);

      setLastCreatedId(created._id);
      setAfterGenMessage(
        "PDF generated and downloaded. Please review it. When ready, click 'Send Email' below to deliver it to the insurer."
      );

      reset();
      setLines(1);
    } catch (e: any) {
      alert(`Error: ${e?.message ?? e}`);
    }
  }

  async function onSendEmail() {
    if (!lastCreatedId) return;
    setSending(true);
    try {
      await api.emailSubmission(lastCreatedId);
      alert("Email sent.");
      setAfterGenMessage(null);
      setLastCreatedId(null);
    } catch (e: any) {
      alert(e?.message || "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto max-w-3xl space-y-6 rounded-2xl bg-white p-6 shadow"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Negotiation Form Submission</h1>
        {/* NEW: Template Drive file ID */}
        <div>
          <label className="text-sm font-medium">
            Google Drive Template File ID
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Paste a Drive file ID (docx)"
            value={templateDriveFileId}
            onChange={(e) => setTemplateDriveFileId(e.target.value.trim())}
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            (We’ll fetch this .docx from your Google Drive, fill it, convert to
            PDF, save to DB, and download it.)
          </p>
        </div>
        {/* NEW: Autofill button (dev helper) */}
        <button
          type="button"
          onClick={autofill}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
          title="Quick fill with sample data"
        >
          Autofill (dev)
        </button>
      </div>

      {!token && (
        <div className="rounded bg-amber-50 p-2 text-sm text-amber-900">
          You must sign in to submit. Your email will be used on the PDF and for
          sending messages.
        </div>
      )}
      {err && (
        <div className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">ID#</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            {...register("id")}
          />
          {errors.id && (
            <p className="text-sm text-red-600">{errors.id.message}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Claim No.</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            {...register("claimNo")}
          />
          {errors.claimNo && (
            <p className="text-sm text-red-600">{errors.claimNo.message}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Patient</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            {...register("patient")}
          />
          {errors.patient && (
            <p className="text-sm text-red-600">{errors.patient.message}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Insurance</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            {...register("insurance")}
          >
            <option value="">Select insurance</option>
            {INSURERS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {errors.insurance && (
            <p className="text-sm text-red-600">{errors.insurance.message}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Prov. Acct. No.</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            {...register("providerAccountNo")}
          />
          {errors.providerAccountNo && (
            <p className="text-sm text-red-600">
              {errors.providerAccountNo.message}
            </p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Doctor</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="e.g. Dr. Dhiraj Jeyanandarajan"
            {...register("doctor")}
          />
          {errors.doctor && (
            <p className="text-sm text-red-600">{errors.doctor.message}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Date of Service</label>
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            {...register("dateOfService")}
          />
          {errors.dateOfService && (
            <p className="text-sm text-red-600">
              {errors.dateOfService.message}
            </p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Submitter Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-slate-50"
            {...register("submitterEmail")}
            value={user?.email || ""}
            readOnly
          />
          <p className="mt-1 text-xs text-slate-500">
            Using your signed-in email {user?.email ? `(${user.email})` : ""}.
          </p>
          {errors.submitterEmail && (
            <p className="text-sm text-red-600">
              {errors.submitterEmail.message}
            </p>
          )}
        </div>
      </section>

      <hr />
      <h2 className="text-lg font-semibold">CPT Codes (1–7)</h2>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <CPTRow key={i} index={i} register={register} />
        ))}
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg bg-slate-100 px-3 py-2"
            onClick={() => setLines((v) => Math.min(7, v + 1))}
            disabled={lines >= 7}
          >
            + Add CPT
          </button>
          <button
            type="button"
            className="rounded-lg bg-slate-100 px-3 py-2"
            onClick={() => setLines((v) => Math.max(1, v - 1))}
            disabled={lines <= 1}
          >
            – Remove
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="text-sm text-slate-500">Total Billed (auto)</div>
          <div className="text-xl font-semibold">
            {fmt.format(totals.billed)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="text-sm text-slate-500">Total Paid (entered)</div>
          <div className="text-xl font-semibold">{fmt.format(totals.paid)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="text-sm text-slate-500">
            Due Date (30 business days)
          </div>
          <div className="text-xl font-semibold">
            {new Date(dueDateIso).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          disabled={isSubmitting}
          className="rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>
      </div>

      {afterGenMessage && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="mb-2">{afterGenMessage}</div>
          <button
            type="button"
            onClick={onSendEmail}
            disabled={sending || !lastCreatedId}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send Email"}
          </button>
        </div>
      )}
    </form>
  );
}
