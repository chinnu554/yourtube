const DEFAULT_BACKEND_URL = "http://localhost:5000";

export const getBackendUrl = () =>
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  DEFAULT_BACKEND_URL;

export const getMediaUrl = (filepath?: string | null) => {
  if (!filepath) return "";

  const normalizedPath = filepath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${getBackendUrl()}/${normalizedPath}`;
};
