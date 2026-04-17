"use client";

import { useEffect, useRef, useState } from "react";
import { getMediaUrl } from "@/lib/media";
import { useUser } from "@/lib/AuthContext";
import { getPlanConfig } from "@/lib/plans";
import {
  Crown,
  Play,
  Pause,
  FastForward,
  Rewind,
  Maximize,
  Volume2,
  VolumeX,
  MessageSquareText,
  SkipForward,
  House,
} from "lucide-react";
import Link from "next/link";

type GesturePosition = "left" | "center" | "right";
type FeedbackType =
  | "forward"
  | "rewind"
  | "play"
  | "pause"
  | "next"
  | "comments"
  | "home";

interface GestureFeedback {
  type: FeedbackType;
  position: GesturePosition;
  label?: string;
}

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  onNextVideo?: () => void;
  onOpenComments?: () => void;
}

export default function VideoPlayer({ video, onNextVideo, onOpenComments }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const [limitReached, setLimitReached] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [feedback, setFeedback] = useState<GestureFeedback | null>(null);

  // Gesture states
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCountRef = useRef(0);
  const lastTapPositionRef = useRef<GesturePosition | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPlan = getPlanConfig(user?.currentPlan || user?.premiumPlan || "free");
  const watchLimitSeconds =
    currentPlan.watchLimitMinutes === null
      ? null
      : currentPlan.watchLimitMinutes * 60;

  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;

    const handleTimeUpdate = () => {
      setProgress((player.currentTime / player.duration) * 100);
      if (watchLimitSeconds !== null && player.currentTime >= watchLimitSeconds) {
        player.currentTime = watchLimitSeconds;
        player.pause();
        setLimitReached(true);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(player.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (limitReached && watchLimitSeconds !== null && player.currentTime >= watchLimitSeconds) {
        player.pause();
      }
    };

    const handlePause = () => setIsPlaying(false);

    player.addEventListener("timeupdate", handleTimeUpdate);
    player.addEventListener("loadedmetadata", handleLoadedMetadata);
    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);

    return () => {
      player.removeEventListener("timeupdate", handleTimeUpdate);
      player.removeEventListener("loadedmetadata", handleLoadedMetadata);
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
    };
  }, [watchLimitSeconds, limitReached]);

  useEffect(() => {
    setLimitReached(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [video?._id]);

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play();
      else videoRef.current.pause();
    }
  };

  const triggerFeedback = (
    type: FeedbackType,
    position: GesturePosition,
    label?: string
  ) => {
    setFeedback({ type, position, label });
    setTimeout(() => setFeedback(null), 900);
  };

  const handleGestureAction = (taps: number, position: GesturePosition) => {
    const player = videoRef.current;
    if (!player) return;

    if (taps === 1) {
      if (position === "center") {
        const nextState = player.paused ? "play" : "pause";
        togglePlay();
        triggerFeedback(nextState, "center", nextState === "play" ? "Play" : "Pause");
      }
    } else if (taps === 2) {
      if (position === "left") {
        player.currentTime = Math.max(0, player.currentTime - 10);
        triggerFeedback("rewind", "left", "Back 10s");
      } else if (position === "right") {
        player.currentTime = Math.min(player.duration, player.currentTime + 10);
        triggerFeedback("forward", "right", "Forward 10s");
      }
    } else if (taps === 3) {
      if (position === "center") {
        triggerFeedback("next", "center", "Next video");
        onNextVideo?.();
      } else if (position === "left") {
        triggerFeedback("comments", "left", "Open comments");
        onOpenComments?.();
      } else if (position === "right") {
        if (typeof window !== "undefined") {
          triggerFeedback("home", "right", "Closing player");
          window.close();
          setTimeout(() => {
            if (!window.closed) {
              window.location.assign("/");
            }
          }, 120);
        }
      }
    }
  };

  const resolveTapPosition = (clientX: number): GesturePosition | null => {
    if (!containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;

    if (x < 0 || x > width) return null;
    if (x < width / 3) return "left";
    if (x < (2 * width) / 3) return "center";
    return "right";
  };

  const handleTap = (clientX: number) => {
    const position = resolveTapPosition(clientX);
    if (!position) return;

    if (lastTapPositionRef.current !== position) {
      tapCountRef.current = 0;
    }
    
    tapCountRef.current += 1;
    lastTapPositionRef.current = position;

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    tapTimeoutRef.current = setTimeout(() => {
      handleGestureAction(tapCountRef.current, position);
      tapCountRef.current = 0;
      lastTapPositionRef.current = null;
      tapTimeoutRef.current = null;
    }, 420);
  };

  const handleOverlayPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".video-controls")) return;
    handleTap(e.clientX);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = (parseFloat(e.target.value) / 100) * videoRef.current.duration;
      videoRef.current.currentTime = newTime;
      setProgress(parseFloat(e.target.value));
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative aspect-video overflow-hidden rounded-xl bg-black group shadow-2xl border border-white/5"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain pointer-events-none"
        poster={`/placeholder.svg?height=480&width=854`}
      >
        <source
          src={getMediaUrl(video?.filepath)}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
      
      {/* Gesture Capture Overlay */}
      <div
        className="absolute inset-0 z-20 cursor-pointer touch-manipulation"
        onPointerUp={handleOverlayPointerUp}
      />

      {/* Gesture Feedback Layers */}
      {feedback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 text-white drop-shadow-lg">
            <div className={`bg-black/40 p-6 rounded-full transition-transform duration-300 ${
              feedback.position === "left" ? "-translate-x-32" : 
              feedback.position === "right" ? "translate-x-32" : ""
            }`}>
              {feedback.type === "forward" ? <FastForward size={48} fill="white" /> : 
               feedback.type === "rewind" ? <Rewind size={48} fill="white" /> :
               feedback.type === "play" ? <Play size={48} fill="white" /> :
               feedback.type === "pause" ? <Pause size={48} fill="white" /> :
               feedback.type === "next" ? <SkipForward size={48} /> :
               feedback.type === "comments" ? <MessageSquareText size={48} /> :
               <House size={48} />}
            </div>
            {feedback.label && (
              <span className={`mt-2 text-sm font-semibold uppercase tracking-[0.2em] ${
                feedback.position === "left" ? "-translate-x-32" : 
                feedback.position === "right" ? "translate-x-32" : ""
              }`}>
                {feedback.label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Middle Play/Pause Indicator (briefly on toggle) */}
      {!isPlaying && !limitReached && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-300">
          <div className="bg-black/40 p-6 rounded-full backdrop-blur-sm border border-white/20">
            <Play size={48} className="text-white fill-white ml-2" />
          </div>
        </div>
      )}

      {/* Premium Limit Badge */}
      {watchLimitSeconds !== null && (
        <div className="absolute left-4 top-4 rounded-full bg-amber-500/90 px-3 py-1.5 text-xs font-bold text-black z-40 flex items-center gap-2 shadow-lg backdrop-blur">
          <Crown className="h-3 w-3" />
          {currentPlan.name.toUpperCase()} LIMIT: {currentPlan.watchLimitMinutes} MIN
        </div>
      )}

      {/* Custom Controls Bar */}
      <div className={`video-controls absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-all duration-300 z-50 ${showControls || !isPlaying ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        {/* Progress Bar */}
        <div className="relative w-full h-1.5 mb-4 group/progress cursor-pointer">
          <input 
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleProgressChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="absolute inset-x-0 h-full bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div 
            className="absolute h-4 w-4 bg-red-600 rounded-full top-1/2 -ml-2 -mt-2 transition-transform scale-0 group-hover/progress:scale-100 shadow-lg border-2 border-white"
            style={{ left: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform p-1">
              {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
            </button>
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (videoRef.current) videoRef.current.volume = val;
                  setIsMuted(val === 0);
                }}
                className="w-0 group-hover/volume:w-20 transition-all accent-white h-1 overflow-hidden"
              />
            </div>
            <span className="text-white text-xs font-medium">
              {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleFullscreen} className="text-white hover:scale-110 transition-transform">
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Limit Reached Modal */}
      {limitReached && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-white z-[60] backdrop-blur-md">
          <div className="max-w-md rounded-2xl border border-white/20 bg-black/60 p-8 text-center backdrop-blur-xl shadow-2xl scale-in-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/30 text-amber-400">
              <Crown className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">Viewing Limit Reached</h3>
            <p className="mt-3 text-gray-300 leading-relaxed">
              Your <span className="text-amber-400 font-semibold">{currentPlan.name}</span> plan restricts viewing to {currentPlan.watchLimitMinutes} minutes per video. 
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/premium"
                className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                UPGRADE TO UNLIMITED
              </Link>
              <button 
                onClick={() => setLimitReached(false)} 
                className="text-gray-400 text-xs hover:text-white transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
