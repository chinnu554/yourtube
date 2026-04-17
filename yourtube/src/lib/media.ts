const DEFAULT_BACKEND_URL = "https://yourtube-backend-wnxy.onrender.com";

export const getBackendUrl = () =>
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  DEFAULT_BACKEND_URL;

export const getMediaUrl = (filepath?: string | null) => {
  if (!filepath) return "";

  const normalizedPath = filepath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${getBackendUrl()}/${normalizedPath}`;
};
