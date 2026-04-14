import React, { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Languages, MapPin, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  city?: string;
  likes?: number;
  dislikes?: number;
  likedBy?: string[];
  dislikedBy?: string[];
}

interface TranslatedCommentState {
  language: string;
  text: string;
}

const COMMENT_REGEX = /^[\p{L}\p{N}\p{M}\s.,!?'"-]+$/u;
const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
];

const isAllowedComment = (value: string) =>
  COMMENT_REGEX.test(value.trim()) && value.trim().length > 0;

const resolveCityFromCoordinates = async (
  latitude: number,
  longitude: number
) => {
  const endpoint = new URL("https://nominatim.openstreetmap.org/reverse");
  endpoint.searchParams.set("lat", latitude.toString());
  endpoint.searchParams.set("lon", longitude.toString());
  endpoint.searchParams.set("format", "jsonv2");

  const response = await fetch(endpoint.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to resolve city");
  }

  const payload = await response.json();
  return (
    payload?.address?.city ||
    payload?.address?.town ||
    payload?.address?.village ||
    payload?.address?.county ||
    "Unknown city"
  );
};

const getCurrentCity = async () => {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return "Unknown city";
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 5 * 60 * 1000,
    });
  }).catch(() => null);

  if (!position) {
    return "Unknown city";
  }

  try {
    return await resolveCityFromCoordinates(
      position.coords.latitude,
      position.coords.longitude
    );
  } catch (error) {
    console.error("Error resolving city:", error);
    return "Unknown city";
  }
};

const Comments = ({
  videoId,
}: {
  videoId: string | string[] | undefined;
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(true);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translatedComments, setTranslatedComments] = useState<
    Record<string, TranslatedCommentState>
  >({});
  const [reactingId, setReactingId] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (!videoId || typeof videoId !== "string") {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    if (typeof videoId !== "string") return;

    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
      toast.error("Unable to load comments right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim() || typeof videoId !== "string") return;

    if (!isAllowedComment(newComment)) {
      toast.error(
        "Special characters are blocked. Use letters, numbers, spaces, and basic punctuation only."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const city = await getCurrentCity();
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment.trim(),
        usercommented: user.name,
        city,
      });

      if (res.data.comment && res.data.data) {
        setComments((prev) => [res.data.data, ...prev]);
      }
      setNewComment("");
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast.error(
        error?.response?.data?.message || "Unable to add comment right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim() || !editingCommentId) return;

    if (!isAllowedComment(editText)) {
      toast.error(
        "Special characters are blocked. Use letters, numbers, spaces, and basic punctuation only."
      );
      return;
    }

    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText.trim() }
      );
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId
              ? { ...c, commentbody: res.data.commentbody }
              : c
          )
        );
        setTranslatedComments((prev) => {
          const next = { ...prev };
          delete next[editingCommentId];
          return next;
        });
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data?.message || "Unable to update comment."
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
      toast.error("Unable to delete comment.");
    }
  };

  const handleReaction = async (commentId: string, reaction: "like" | "dislike") => {
    if (!user) {
      toast.error("Sign in to react to comments.");
      return;
    }

    setReactingId(commentId);
    try {
      const res = await axiosInstance.post(`/comment/react/${commentId}`, {
        userId: user._id,
        reaction,
      });

      if (res.data.removed) {
        setComments((prev) => prev.filter((comment) => comment._id !== commentId));
        toast.message("Comment removed after receiving 2 dislikes.");
        return;
      }

      if (res.data.data) {
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === commentId ? res.data.data : comment
          )
        );
      }
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Unable to react.");
    } finally {
      setReactingId(null);
    }
  };

  const handleTranslate = async (commentId: string) => {
    setTranslatingId(commentId);
    try {
      const res = await axiosInstance.post(`/comment/translate/${commentId}`, {
        targetLanguage,
      });

      setTranslatedComments((prev) => ({
        ...prev,
        [commentId]: {
          language: res.data.targetLanguage,
          text: res.data.translatedText,
        },
      }));
    } catch (error) {
      console.log(error);
      toast.error("Unable to translate this comment right now.");
    } finally {
      setTranslatingId(null);
    }
  };

  const clearTranslation = (commentId: string) => {
    setTranslatedComments((prev) => {
      const next = { ...prev };
      delete next[commentId];
      return next;
    });
  };

  if (loading) {
    return <div>Loading comments...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {user && (
        <div className="flex gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment in any language..."
              value={newComment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNewComment(e.target.value)
              }
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            <p className="text-xs text-gray-500">
              Special characters are blocked automatically. Letters from any
              language, numbers, spaces, and basic punctuation are allowed.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => {
            const translatedComment = translatedComments[comment._id];
            const userLiked = comment.likedBy?.includes(user?._id);
            const userDisliked = comment.dislikedBy?.includes(user?._id);

            return (
              <div key={comment._id} className="flex gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />
                  <AvatarFallback>{comment.usercommented?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{comment.usercommented}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {comment.city || "Unknown city"}
                    </span>
                    <span className="text-xs text-gray-600">
                      {formatDistanceToNow(new Date(comment.commentedon))} ago
                    </span>
                  </div>

                  {editingCommentId === comment._id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setEditText(e.target.value)
                        }
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={handleUpdateComment}
                          disabled={!editText.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">{comment.commentbody}</p>
                      {translatedComment && (
                        <div className="mt-2 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                          <p className="font-medium text-xs uppercase tracking-wide text-gray-500">
                            Translated to {translatedComment.language}
                          </p>
                          <p className="mt-1">{translatedComment.text}</p>
                          <button
                            onClick={() => clearTranslation(comment._id)}
                            className="mt-2 text-xs text-gray-500 hover:text-black"
                          >
                            Hide translation
                          </button>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          variant={userLiked ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => handleReaction(comment._id, "like")}
                          disabled={reactingId === comment._id || comment.userid === user?._id}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          {comment.likes || 0}
                        </Button>
                        <Button
                          variant={userDisliked ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => handleReaction(comment._id, "dislike")}
                          disabled={reactingId === comment._id || comment.userid === user?._id}
                        >
                          <ThumbsDown className="h-4 w-4" />
                          {comment.dislikes || 0}
                        </Button>
                        <select
                          value={targetLanguage}
                          onChange={(e) => setTargetLanguage(e.target.value)}
                          className="h-8 rounded-md border border-gray-200 px-2 text-sm"
                        >
                          {LANGUAGE_OPTIONS.map((language) => (
                            <option key={language.value} value={language.value}>
                              {language.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTranslate(comment._id)}
                          disabled={translatingId === comment._id}
                        >
                          <Languages className="h-4 w-4" />
                          Translate
                        </Button>
                        {comment.userid === user?._id && (
                          <>
                            <button
                              onClick={() => handleEdit(comment)}
                              className="text-sm text-gray-500 hover:text-black"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(comment._id)}
                              className="text-sm text-gray-500 hover:text-black"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Comments;
