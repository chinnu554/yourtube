import comment from "../Modals/comment.js";
import mongoose from "mongoose";

const COMMENT_REGEX = /^[\p{L}\p{N}\p{M}\s.,!?'"-]+$/u;

const isValidCommentBody = (value = "") =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  COMMENT_REGEX.test(value.trim());

const normalizeLangCode = (value = "") => {
  if (typeof value !== "string") return "en";
  return value.trim().toLowerCase() || "en";
};

const translateText = async (text, targetLanguage) => {
  const endpoint = new URL(
    "https://translate.googleapis.com/translate_a/single"
  );
  endpoint.searchParams.set("client", "gtx");
  endpoint.searchParams.set("sl", "auto");
  endpoint.searchParams.set("tl", targetLanguage);
  endpoint.searchParams.set("dt", "t");
  endpoint.searchParams.set("q", text);

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Translation failed with status ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.[0])
    ? payload[0].map((chunk) => chunk?.[0] || "").join("")
    : text;
};

export const postcomment = async (req, res) => {
  const commentdata = {
    ...req.body,
    commentbody: req.body?.commentbody?.trim(),
    city: req.body?.city?.trim() || "Unknown city",
  };
  if (!isValidCommentBody(commentdata?.commentbody)) {
    return res.status(400).json({
      message:
        "Comments can only include letters, numbers, spaces, and basic punctuation.",
    });
  }

  const postcomment = new comment(commentdata);
  try {
    const savedComment = await postcomment.save();
    return res.status(200).json({ comment: true, data: savedComment });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment
      .find({ videoid: videoid })
      .sort({ commentedon: -1 });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  if (!isValidCommentBody(commentbody)) {
    return res.status(400).json({
      message:
        "Comments can only include letters, numbers, spaces, and basic punctuation.",
    });
  }
  try {
    const updatecomment = await comment.findByIdAndUpdate(
      _id,
      {
        $set: { commentbody: commentbody.trim() },
      },
      { new: true }
    );
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const reacttocomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId, reaction } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user" });
  }

  if (!["like", "dislike"].includes(reaction)) {
    return res.status(400).json({ message: "Invalid reaction" });
  }

  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) {
      return res.status(404).json({ message: "Comment unavailable" });
    }

    if (existingComment.userid.toString() === userId) {
      return res
        .status(400)
        .json({ message: "You cannot react to your own comment." });
    }

    const alreadyLiked = existingComment.likedBy.some(
      (id) => id.toString() === userId
    );
    const alreadyDisliked = existingComment.dislikedBy.some(
      (id) => id.toString() === userId
    );

    if (reaction === "like") {
      if (alreadyLiked) {
        existingComment.likedBy = existingComment.likedBy.filter(
          (id) => id.toString() !== userId
        );
      } else {
        existingComment.likedBy.push(userId);
      }

      if (alreadyDisliked) {
        existingComment.dislikedBy = existingComment.dislikedBy.filter(
          (id) => id.toString() !== userId
        );
      }
    }

    if (reaction === "dislike") {
      if (alreadyDisliked) {
        existingComment.dislikedBy = existingComment.dislikedBy.filter(
          (id) => id.toString() !== userId
        );
      } else {
        existingComment.dislikedBy.push(userId);
      }

      if (alreadyLiked) {
        existingComment.likedBy = existingComment.likedBy.filter(
          (id) => id.toString() !== userId
        );
      }
    }

    existingComment.likes = existingComment.likedBy.length;
    existingComment.dislikes = existingComment.dislikedBy.length;

    if (existingComment.dislikes >= 2) {
      await comment.findByIdAndDelete(_id);
      return res.status(200).json({
        removed: true,
        message: "Comment removed after receiving 2 dislikes.",
      });
    }

    await existingComment.save();
    return res.status(200).json({
      removed: false,
      data: existingComment,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const translatecomment = async (req, res) => {
  const { id: _id } = req.params;
  const targetLanguage = normalizeLangCode(req.body?.targetLanguage);

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }

  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) {
      return res.status(404).json({ message: "Comment unavailable" });
    }

    const translatedText = await translateText(
      existingComment.commentbody,
      targetLanguage
    );

    return res.status(200).json({
      translatedText,
      targetLanguage,
    });
  } catch (error) {
    console.error(" error:", error);
    return res
      .status(500)
      .json({ message: "Unable to translate comment right now." });
  }
};
