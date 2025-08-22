import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const nav = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-sky-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between p-6">
        <h1 className="text-2xl font-bold">Medical Arbitration Portal</h1>
        <div className="flex gap-2">
          <button
            className="rounded-lg bg-slate-100 px-3 py-2"
            onClick={() => nav("/form")}
          >
            New Submission
          </button>
          <button
            className="rounded-lg bg-slate-100 px-3 py-2"
            onClick={() => nav("/submissions")}
          >
            Recent Submissions
          </button>
          <button
            className="rounded-lg bg-red-50 px-3 py-2 text-red-700"
            onClick={() => {
              logout();
              nav("/signup", { replace: true });
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 p-6 md:grid-cols-2">
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
      </main>
    </div>
  );
}
