// src/components/StatusBadge.tsx

type Props = { phase?: string };

const classMap: Record<string, string> = {
  Pending: "bg-emerald-50 text-emerald-700",
  "Grace Period": "bg-amber-50 text-amber-700",
  Missed: "bg-rose-50 text-rose-700",
  Expired: "bg-slate-100 text-slate-700",
};

export default function StatusBadge({ phase }: Props) {
  const cls = classMap[phase || ""] || "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}
    >
      {phase || "—"}
    </span>
  );
}
