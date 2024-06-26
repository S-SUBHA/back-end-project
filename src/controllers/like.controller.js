import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { asyncHandler } from "../utils/AsyncHandler.util.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  // get the videoId from the req.params
  // check for any like-object present in the db corresponding to the video
  // if not: 1. check if the logged in user created the like
  // 2. delete the entry
  // else: create an entry
  // return the newly created like-object

  // const { videoId } = req.params;
  //TODO: toggle like on video

  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video id is required!");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id!");
  }

  const deletedLike = await Like.findOneAndDelete({
    $and: [
      { video: new mongoose.Types.ObjectId(videoId) },
      { likedBy: new mongoose.Types.ObjectId(req.user._id) },
    ],
  });

  if (deletedLike) {
    return res
      .status(200)
      .json(new ApiResponse(200, deletedLike, "Like removed successfully."));
  }

  const createdLike = await Like.create({
    likedBy: new mongoose.Types.ObjectId(req.user._id),
    video: new mongoose.Types.ObjectId(videoId),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, createdLike, "Like created successfully."));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  // const { commentId } = req.params;
  //TODO: toggle like on comment

  const { commentId } = req.params;
  if (!commentId) {
    throw new ApiError(400, "Comment id is required!");
  }
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id!");
  }

  const like = await Like.findOne({
    $and: [
      { comment: new mongoose.Types.ObjectId(commentId) },
      { likedBy: new mongoose.Types.ObjectId(req.user._id) },
    ],
  });

  if (like) {
    const deletedLike = await Like.findByIdAndDelete(like._id);

    return res
      .status(200)
      .json(new ApiResponse(200, deletedLike, "Like removed successfully."));
  }

  const createdLike = await Like.create({
    likedBy: new mongoose.Types.ObjectId(req.user._id),
    comment: new mongoose.Types.ObjectId(commentId),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, createdLike, "Like created successfully."));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  // const { tweetId } = req.params;
  //TODO: toggle like on tweet

  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError(400, "Tweet id is required!");
  }
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id!");
  }

  const like = await Like.findOne({
    $and: [
      { tweet: new mongoose.Types.ObjectId(tweetId) },
      { likedBy: new mongoose.Types.ObjectId(req.user._id) },
    ],
  });

  if (like) {
    const deletedLike = await Like.findByIdAndDelete(like._id);

    return res
      .status(200)
      .json(new ApiResponse(200, deletedLike, "Like removed successfully."));
  }

  const createdLike = await Like.create({
    likedBy: new mongoose.Types.ObjectId(req.user._id),
    tweet: new mongoose.Types.ObjectId(tweetId),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, createdLike, "Like created successfully."));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  // get the user from req.user(auth middleware)
  // query from the db (under Like model) for all entries (videos) that is likedby the urer
  // use aggregation pipelines to get the details of the videos
  // return the query result

  //TODO: get all liked videos

  const likedVideos = await Like.aggregate([
    {
      $match: {
        $and: [{ likedBy: req.user._id }, { video: { $exists: true } }],
      },
    },
    {
      $lookup: {
        from: "videos",
        foreignField: "_id",
        localField: "video",
        as: "video",
      },
    },
    {
      $addFields: {
        video: {
          $arrayElemAt: ["$video", 0],
        },
      },
    },
    {
      $project: {
        likedBy: 1,
        video: 1,
        createdAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        likedVideos,
        "All liked videos fetched successfully."
      )
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
