import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface RelatedVideosProps {
  videos?: Array<{
    _id: string;
    videotitle: string;
    videochanel: string;
    views: number;
    createdAt: string;
  }>;
}
const vid = "/video/vdo.mp4";
export default function RelatedVideos({ videos = [] }: RelatedVideosProps) {
  return (
    <div className="space-y-2">
      {videos.length === 0 && (
        <p className="text-sm text-gray-500">No related videos available.</p>
      )}
      {videos.map((video) => (
        <Link
          key={video._id}
          href={`/watch/${video._id}`}
          className="group flex gap-3 rounded-lg p-1 transition-colors hover:bg-gray-50"
        >
          <div className="relative aspect-video w-32 flex-shrink-0 overflow-hidden rounded bg-gray-100 sm:w-40">
            <video
              src={vid}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
              {video.videotitle}
            </h3>
            <p className="text-xs text-gray-600 mt-1">{video.videochanel}</p>
            <p className="text-xs text-gray-600">
              {video.views.toLocaleString()} views •{" "}
              {formatDistanceToNow(new Date(video.createdAt))} ago
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
