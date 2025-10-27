export default function LoginPage() {
  const BASE_URL = import.meta.env.VITE_API_BASE ?? "";

  const handleGoogleLogin = () => {
    const redirect = "/home"; // your app redirect
    console.log("Initiating Google login, redirect to:", BASE_URL);
    window.location.href = `${BASE_URL}/api/auth/google/start?redirect=${encodeURIComponent(
      redirect
    )}`;
    console.log("Initiating Google login, redirect to:", BASE_URL);
    window.location.href = `${BASE_URL}/api/auth/google/start?redirect=${encodeURIComponent(
      redirect
    )}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">
          Welcome to Med Arb Group
        </h1>
        <p className="text-slate-600 mb-8 text-sm">
          Sign in securely with your Google account
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex items-center justify-center gap-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:shadow transition"
        >
          {/* Google “G” icon */}
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Continue with Google
        </button>
        <div className="mt-8 text-xs text-slate-500">
          By signing in, you agree to our{" "}
          <a href="/terms" className="underline hover:text-sky-600">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline hover:text-sky-600">
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </div>
  );
}
