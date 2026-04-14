import mongoose from "mongoose";
import path from "path";
import download from "../Modals/download.js";
import users from "../Modals/Auth.js";
import video from "../Modals/video.js";

const getTodayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getDailyDownloadCount = async (userId) =>
  download.countDocuments({
    userid: userId,
    downloadedAt: { $gte: getTodayStart() },
  });

export const getdownloads = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user." });
  }

  try {
    const downloads = await download
      .find({ userid: userId })
      .populate("videoid")
      .sort({ downloadedAt: -1 });

    return res.status(200).json(downloads.filter((item) => item.videoid));
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const downloadvideo = async (req, res) => {
  const { videoId } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(404).json({ message: "Video unavailable." });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Sign in to download videos." });
  }

  try {
    const [existingUser, existingVideo] = await Promise.all([
      users.findById(userId),
      video.findById(videoId),
    ]);

    if (!existingUser) {
      return res.status(404).json({ message: "User unavailable." });
    }

    if (!existingVideo) {
      return res.status(404).json({ message: "Video unavailable." });
    }

    if (!existingUser.isPremium) {
      const todayDownloads = await getDailyDownloadCount(userId);

      if (todayDownloads >= 1) {
        return res.status(403).json({
          premiumRequired: true,
          message:
            "Free users can download only 1 video per day. Upgrade to Premium for unlimited downloads.",
        });
      }
    }

    await download.create({
      userid: userId,
      videoid: videoId,
    });

    const absolutePath = path.resolve(existingVideo.filepath);
    return res.download(absolutePath, existingVideo.filename);
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Unable to download video." });
  }
};
