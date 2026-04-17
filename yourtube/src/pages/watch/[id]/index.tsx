import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/router";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const [videos, setvideo] = useState<any>(null);
  const [video, setvide] = useState<any[]>([]);
  const [loading, setloading] = useState(true);

  const handleNextVideo = () => {
    if (video && video.length > 0) {
      router.push(`/watch/${video[0]._id}`);
    } else {
      router.push("/");
    }
  };

  const handleOpenComments = () => {
    const commentsEl = document.getElementById("comments-section");
    if (commentsEl) {
      commentsEl.scrollIntoView({ behavior: "smooth", block: "start" });
      if (commentsEl instanceof HTMLElement) {
        commentsEl.focus({ preventScroll: true });
      }
    }
  };

  useEffect(() => {
    const fetchvideo = async () => {
      if (!id || typeof id !== "string") return;
      try {
        const res = await axiosInstance.get("/video/getall");
        const matchedVideo = res.data?.find((vid: any) => vid._id === id) || null;
        const relatedVideos = Array.isArray(res.data)
          ? res.data.filter((vid: any) => vid._id !== id)
          : [];

        setvideo(matchedVideo);
        setvide(relatedVideos);
      } catch (error) {
        console.log(error);
        setvideo(null);
        setvide([]);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, [id]);

  if (loading) {
    return <div>Loading..</div>;
  }
  
  if (!videos) {
    return <div>Video not found</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-red-100 bg-red-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-red-700">Watch Together</p>
                <p className="text-sm text-red-600">Start a live call, share a YouTube tab, and discuss this video with a friend.</p>
              </div>
              <Button asChild className="rounded-full bg-red-600 text-white hover:bg-red-500">
                <Link href="/watch-together">Open call room</Link>
              </Button>
            </div>
            <Videopplayer 
              video={videos} 
              onNextVideo={handleNextVideo}
              onOpenComments={handleOpenComments}
            />
            <VideoInfo video={videos} />
            <div
              id="comments-section"
              tabIndex={-1}
              className="scroll-mt-24 focus:outline-none"
            >
              <Comments videoId={id as string} />
            </div>
          </div>
          <div className="space-y-4">
            <RelatedVideos videos={video} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;
