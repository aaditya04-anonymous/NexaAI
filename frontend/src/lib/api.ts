import { getApiBase, TOKEN_KEY } from "./config";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; isForm?: boolean; skipAuth?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, isForm, skipAuth } = options;
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token && !skipAuth) headers["Authorization"] = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (isForm) {
    payload = body as FormData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, { method, headers, body: payload });
  } catch (err) {
    throw new ApiError(0, "Could not reach the backend. Check the API URL in Settings and that the server is running.");
  }

  if (response.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event("nexa:unauthorized"));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? safeJson(text) : undefined;

  if (!response.ok) {
    const detail = (data && typeof data === "object" && "detail" in data) ? (data as { detail: unknown }).detail : data;
    const message = typeof detail === "string" ? detail : response.statusText || "Request failed";
    throw new ApiError(response.status, message, detail);
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, opts?: { skipAuth?: boolean }) => request<T>(path, { method: "POST", body, skipAuth: opts?.skipAuth }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form, isForm: true }),
};

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBase()}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
