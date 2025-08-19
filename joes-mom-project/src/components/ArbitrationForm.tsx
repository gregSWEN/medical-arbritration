import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { INSURERS } from "@/lib/insurers";
import { CPT_PRICE } from "@/lib/cpt";
import { addBusinessDays, toIsoDate, formatShort } from "@/lib/dates";
import { CPTRow } from "./CPTRow";
import type { Submission } from "@/types";

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
  const [lines, setLines] = useState(1);
  const {
    register,
    handleSubmit,
    watch,
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

  async function onSubmit(data: z.infer<typeof schema>) {
    // enforce at least one CPT code actually present
    const hasCpt = (data.cpts ?? []).some(
      (l) => (l.code ?? "").trim().length > 0
    );
    if (!hasCpt) {
      alert("Please enter at least one CPT code.");
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
      dateOfService: data.dateOfService, // already yyyy-MM-dd
      submitterEmail: data.submitterEmail.trim(),
      cpts: cleaned,
      totals,
      dateSubmittedIso: toIsoDate(new Date()),
      dueDateIso,
    };

    const { api } = await import("@/services/api");
    try {
      const res = await api.createSubmission(payload);
      if (res.ok) {
        alert(res.message);
        reset();
        setLines(1);
      } else {
        alert("Submission failed.");
      }
    } catch (e: any) {
      alert(`Error submitting: ${e?.message ?? e}`);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto max-w-3xl space-y-6 rounded-2xl bg-white p-6 shadow"
    >
      <h1 className="text-2xl font-bold">Negotiation Form Submission</h1>

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
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="you@clinic.com"
            {...register("submitterEmail")}
          />
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
    </form>
  );
}
