"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Download, DownloadCloud } from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getMediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";

export default function DownloadsContent() {
  const { user } = useUser();
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) {
      setDownloads([]);
      setLoading(false);
      return;
    }

    const loadDownloads = async () => {
      try {
        const response = await axiosInstance.get(`/download/${user._id}`);
        setDownloads(response.data);
      } catch (error) {
        console.error("Error loading downloads:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDownloads();
  }, [user?._id]);

  if (!user) {
    return (
      <div className="py-12 text-center">
        <DownloadCloud className="mx-auto mb-4 h-16 w-16 text-gray-400" />
        <h2 className="mb-2 text-xl font-semibold">Sign in to view downloads</h2>
        <p className="text-gray-600">
          Videos you download will appear in your Downloads section.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div>Loading downloads...</div>;
  }

  if (downloads.length === 0) {
    return (
      <div className="py-12 text-center">
        <DownloadCloud className="mx-auto mb-4 h-16 w-16 text-gray-400" />
        <h2 className="mb-2 text-xl font-semibold">No downloads yet</h2>
        <p className="text-gray-600">
          Download a video and it will show up here for quick access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{downloads.length} downloaded videos</p>
      <div className="space-y-4">
        {downloads.map((item) => (
          <div key={item._id} className="flex gap-4 rounded-xl border p-3">
            <Link href={`/watch/${item.videoid?._id}`} className="flex-shrink-0">
              <div className="relative aspect-video w-40 overflow-hidden rounded-lg bg-gray-100">
                <video
                  src={getMediaUrl(item.videoid?.filepath)}
                  className="h-full w-full object-cover"
                />
              </div>
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/watch/${item.videoid?._id}`}>
                <h3 className="line-clamp-2 text-sm font-medium hover:text-blue-600">
                  {item.videoid?.videotitle}
                </h3>
              </Link>
              <p className="mt-1 text-sm text-gray-600">{item.videoid?.videochanel}</p>
              <p className="text-sm text-gray-600">
                {item.videoid?.views?.toLocaleString?.() || 0} views
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Downloaded {formatDistanceToNow(new Date(item.downloadedAt))} ago
              </p>
            </div>
            <div className="flex items-start">
              <Button asChild variant="ghost" size="sm" className="rounded-full bg-gray-100">
                <Link href={`/watch/${item.videoid?._id}`}>
                  <Download className="mr-2 h-4 w-4" />
                  Open video
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
