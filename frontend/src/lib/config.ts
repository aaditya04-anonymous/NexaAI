// The backend base URL. Override at build time with VITE_API_BASE_URL,
// or at runtime by setting localStorage['nexa_api_base'] (used by the
// Settings page so people can point at a different backend without rebuilding).
const DEFAULT_API_BASE = "http://127.0.0.1:8000";

export function getApiBase(): string {
  const fromStorage = typeof window !== "undefined" ? window.localStorage.getItem("nexa_api_base") : null;
  const raw = fromStorage || import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE;
  // Normalize localhost:8000 to 127.0.0.1:8000 on Windows to prevent browser IPv6 connection failures
  const trimmed = raw.replace(/\/+$/, "");
  if (trimmed === "http://localhost:8000") {
    return "http://127.0.0.1:8000";
  }
  return trimmed;
}

export function setApiBase(url: string) {
  window.localStorage.setItem("nexa_api_base", url.replace(/\/+$/, ""));
}

export const TOKEN_KEY = "nexa_access_token";
