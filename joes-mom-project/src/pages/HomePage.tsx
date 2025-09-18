import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const nav = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Start Negotiation</h2>
        <p className="mt-2 text-sm text-slate-600">
          Create a negotiation packet and email the insurer.
        </p>
        <button
          className="mt-4 rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
          onClick={() => nav("/form")}
        >
          Start new submission
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Recent Submissions</h2>
        <p className="mt-2 text-sm text-slate-600">
          Review the most recent negotiation forms and their status.
        </p>
        <button
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-black"
          onClick={() => nav("/submissions")}
        >
          View recent
        </button>
      </div>
    </div>
  );
}
