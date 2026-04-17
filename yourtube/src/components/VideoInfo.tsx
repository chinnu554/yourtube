import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { useRouter } from "next/router";
import { getBackendUrl } from "@/lib/media";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const router = useRouter();

  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user]);
  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleWatchLater = async () => {
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleDislike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: any) => prev + 1);
          setIsDisliked(true);
          if (isLiked) {
            setlikes((prev: any) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDownload = async () => {
    if (!user?._id) {
      toast.error("Sign in to download videos.");
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(`${getBackendUrl()}/download/${video._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user._id }),
      });

      if (!response.ok) {
        let parsedError: any = null;

        try {
          parsedError = await response.json();
        } catch {
          parsedError = null;
        }

        if (response.status === 403 && parsedError?.premiumRequired) {
          toast.error(parsedError.message);
          router.push("/premium");
          return;
        }

        toast.error(parsedError?.message || "Unable to download video.");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = video.filename || `${video.videotitle}.mp4`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Download started.");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Unable to download video.");
    } finally {
      setIsDownloading(false);
    }
  };
  return (
    <div className="space-y-4 overflow-x-hidden">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Channel Info Section */}
        <div className="flex items-center justify-between gap-3 w-full md:w-auto">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="truncate font-medium">{video.videochanel}</h3>
              <p className="text-sm text-gray-600">1.2M subscribers</p>
            </div>
          </div>
          <Button className="shrink-0 px-4">Subscribe</Button>
        </div>

        {/* Action Buttons Section */}
        <div className="w-full md:w-auto overflow-x-auto pb-1 [scrollbar-width:none] touch-pan-x overscroll-x-contain [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex items-center gap-2 pr-1">
            <div className="flex items-center rounded-full bg-gray-100 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-l-full px-3 sm:px-4"
                onClick={handleLike}
              >
                <ThumbsUp
                  className={`mr-2 h-5 w-5 ${
                    isLiked ? "fill-black text-black" : ""
                  }`}
                />
                <span className="whitespace-nowrap">{likes.toLocaleString()}</span>
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <Button
                variant="ghost"
                size="sm"
                className="rounded-r-full px-3 sm:px-4"
                onClick={handleDislike}
              >
                <ThumbsDown
                  className={`mr-2 h-5 w-5 ${
                    isDisliked ? "fill-black text-black" : ""
                  }`}
                />
                <span className="whitespace-nowrap">{dislikes.toLocaleString()}</span>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className={`rounded-full bg-gray-100 px-3 sm:px-4 shrink-0 ${
                isWatchLater ? "text-primary" : ""
              }`}
              onClick={handleWatchLater}
            >
              <Clock className="mr-2 h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">
                {isWatchLater ? "Saved" : "Watch Later"}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full bg-gray-100 px-3 sm:px-4 shrink-0"
            >
              <Share className="mr-2 h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">Share</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="rounded-full bg-gray-100 px-3 sm:px-4 shrink-0"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Download className="mr-2 h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">
                {isDownloading ? "Downloading..." : "Download"}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full bg-gray-100"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;
