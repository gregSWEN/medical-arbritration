import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-lg px-3 py-2 text-sm font-medium",
    isActive ? "bg-sky-50 text-sky-700" : "text-slate-700 hover:bg-slate-50",
  ].join(" ");

export default function NavBar() {
  const { logout, user } = useAuth();
  const nav = useNavigate();

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <button
          onClick={() => nav("/home")}
          className="text-lg font-bold tracking-tight text-slate-900"
          aria-label="Go to Home"
        >
          Medical Arbitration Portal
        </button>

        <div className="flex items-center gap-2">
          <NavLink to="/home" className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/form" className={linkClass}>
            New Submission
          </NavLink>
          <NavLink to="/submissions" className={linkClass}>
            Recent
          </NavLink>
        </div>

        <div className="flex items-center gap-2">
          {user?.email && (
            <span className="hidden text-sm text-slate-600 md:inline">
              {user.email}
            </span>
          )}
          <button
            onClick={() => {
              logout();
              nav("/login", { replace: true });
            }}
            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
