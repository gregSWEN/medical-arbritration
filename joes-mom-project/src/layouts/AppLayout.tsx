import { Outlet } from "react-router-dom";
import NavBar from "@/components/NavBar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-sky-50">
      <NavBar />
      <main className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
