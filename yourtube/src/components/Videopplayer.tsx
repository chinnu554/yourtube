"use client";

import { useEffect, useRef, useState } from "react";
import { getMediaUrl } from "@/lib/media";
import { useUser } from "@/lib/AuthContext";
import { getPlanConfig } from "@/lib/plans";
import { Crown } from "lucide-react";
import Link from "next/link";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useUser();
  const [limitReached, setLimitReached] = useState(false);
  const currentPlan = getPlanConfig(user?.currentPlan || user?.premiumPlan || "free");
  const watchLimitSeconds =
    currentPlan.watchLimitMinutes === null
      ? null
      : currentPlan.watchLimitMinutes * 60;

  useEffect(() => {
    const player = videoRef.current;
    if (!player || watchLimitSeconds === null) {
      setLimitReached(false);
      return;
    }

    const handleTimeUpdate = () => {
      if (player.currentTime >= watchLimitSeconds) {
        player.currentTime = watchLimitSeconds;
        player.pause();
        setLimitReached(true);
      }
    };

    const handlePlay = () => {
      if (limitReached && player.currentTime >= watchLimitSeconds) {
        player.pause();
      }
    };

    player.addEventListener("timeupdate", handleTimeUpdate);
    player.addEventListener("play", handlePlay);

    return () => {
      player.removeEventListener("timeupdate", handleTimeUpdate);
      player.removeEventListener("play", handlePlay);
    };
  }, [watchLimitSeconds, limitReached]);

  useEffect(() => {
    setLimitReached(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [video?._id]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        poster={`/placeholder.svg?height=480&width=854`}
      >
        <source
          src={getMediaUrl(video?.filepath)}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
      {watchLimitSeconds !== null && (
        <div className="absolute left-3 top-3 rounded-full bg-black/75 px-3 py-1 text-xs text-white">
          {currentPlan.name} plan: {currentPlan.watchLimitMinutes} min limit
        </div>
      )}
      {limitReached && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75 p-6 text-white">
          <div className="max-w-md rounded-2xl border border-white/10 bg-black/70 p-6 text-center backdrop-blur">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
              <Crown className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold">Viewing limit reached</h3>
            <p className="mt-2 text-sm text-gray-200">
              Your {currentPlan.name} plan allows {currentPlan.watchLimitMinutes}
              {" "}minutes per video. Upgrade for longer viewing time.
            </p>
            <Link
              href="/premium"
              className="mt-4 inline-flex rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Upgrade plan
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
