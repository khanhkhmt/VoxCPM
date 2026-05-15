export const getApiBaseUrl = () => {
  // If we are in the browser, we can use window.location.origin
  // But for SSR or when we want to force a specific domain via env, we use the env variable.
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin;
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || "https://103-214-9-83.nip.io";
};

export const API_BASE_URL = getApiBaseUrl();

export const getBackendBaseUrl = () => {
  return process.env.BACKEND_API_BASE_URL || "http://127.0.0.1:8808";
};

export const BACKEND_BASE_URL = getBackendBaseUrl();
