import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/services/api";

type JwtPayload = { email?: string; exp?: number };
type AuthCtx = {
  token: string | null;
  ready: boolean;
  user?: JwtPayload | null;
  login: (email: string, password: string) => Promise<void>;
  registerThenLogin: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

function decode(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}
function isExpired(token: string): boolean {
  const p = decode(token);
  if (!p?.exp) return true;
  return p.exp * 1000 < Date.now();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<JwtPayload | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t && !isExpired(t)) {
      setToken(t);
      setUser(decode(t));
    } else {
      localStorage.removeItem("token");
    }
    setReady(true);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    if (!res.ok || !res.token) throw new Error(res.message || "Login failed");
    localStorage.setItem("token", res.token);
    setToken(res.token);
    setUser(decode(res.token));
  };

  const registerThenLogin = async (email: string, password: string) => {
    const reg = await api.register(email, password);
    if (!reg.ok) throw new Error(reg.message || "Registration failed");
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider
      value={{ token, ready, user, login, registerThenLogin, logout }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
