"use client";

import { useRef } from "react";
import { getMediaUrl } from "@/lib/media";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden">
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
    </div>
  );
}
