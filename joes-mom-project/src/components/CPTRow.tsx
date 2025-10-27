// File: src/components/CPTRow.tsx
import { CPT_SUGGESTIONS } from "@/lib/cpt";
import { UseFormRegister } from "react-hook-form";

export type CPTFormLine = {
  code?: string;
  count?: number;
  initialPayment?: number;
};

export function CPTRow({
  index,
  register,
}: {
  index: number;
  register: UseFormRegister<any>;
}) {
  const id = (n: string) => `cpts.${index}.${n}`;
  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-5">
        <label className="text-sm font-medium">CPT Code</label>
        <input
          list={`cpt-suggestions`}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="e.g. 95937"
          {...register(id("code"))}
        />
      </div>
      <div className="col-span-3">
        <label className="text-sm font-medium">Count</label>
        <input
          type="number"
          min={1}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          defaultValue={1}
          {...register(id("count"), { valueAsNumber: true })}
        />
      </div>
      <div className="col-span-4">
        <label className="text-sm font-medium">Initial Payment</label>
        <input
          type="number"
          min={0}
          step="0.01" // or step="any"
          inputMode="decimal" // better mobile keyboard
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="0.00"
          {...register(id("initialPayment"), {
            valueAsNumber: true,
            setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
          })}
        />
      </div>

      {/* Shared datalist */}
      <datalist id="cpt-suggestions">
        {CPT_SUGGESTIONS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
}
