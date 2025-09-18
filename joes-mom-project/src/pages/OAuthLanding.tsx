import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { me } from "@/services/api";

export default function OAuthLanding() {
  const [sp] = useSearchParams();

  useEffect(() => {
    // 1) Store token once
    const token = sp.get("token");
    const redirect = sp.get("r") || "/home";
    const np = sp.get("np") === "1";

    if (token) localStorage.setItem("token", token);

    // 2) Decide destination robustly
    // If server said needs profile, trust it and go.
    if (np) {
      window.location.replace("/profile-setup");
      return;
    }

    // 3) Otherwise, check profile once (covers stale token / old users / missing np flag)
    me()
      .then((res) => {
        if (res?.ok && res?.needsProfile) {
          window.location.replace("/profile-setup");
        } else {
          window.location.replace(redirect);
        }
      })
      .catch(() => {
        // In doubt, push to login to restart cleanly
        window.location.replace("/login");
      });
  }, [sp]);

  return <div>Signing you in…</div>;
}
