export const WATCH_TOGETHER_ICE_SERVERS: RTCConfiguration["iceServers"] = [
  { urls: ["stun:stun.l.google.com:19302"] },
  { urls: ["stun:stun1.l.google.com:19302"] },
];

export const normalizeYouTubeUrl = (value: string) => {
  const input = value.trim();
  if (!input) return "";

  try {
    const url = new URL(input);
    if (
      url.hostname.includes("youtube.com") ||
      url.hostname.includes("youtu.be")
    ) {
      return url.toString();
    }
  } catch {
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
      return `https://www.youtube.com/watch?v=${input}`;
    }
  }

  return "";
};

export const getSupportedRecordingMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || "";
};

export const buildRecordingFilename = (roomId: string) => {
  const safeTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `yourtube-watch-together-${roomId}-${safeTimestamp}.webm`;
};
