import ArbitrationForm from "@/components/ArbitrationForm";

export default function App() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Medical Arbitration Portal</h1>
        </header>
        <ArbitrationForm />
      </div>
    </div>
  );
}
