import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { asyncHandler } from "../utils/AsyncHandler.util.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const { channelId } = req.query;
  if (!channelId) {
    throw new ApiError(400, "Channel id is required!");
  }
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id!");
  }

  const channelStats = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(channelId) } },
    {
      $lookup: {
        from: "videos",
        foreignField: "owner",
        localField: "_id",
        as: "videos",
        pipeline: [
          {
            $lookup: {
              from: "likes",
              foreignField: "video",
              localField: "_id",
              as: "likes",
            },
          },
          {
            $addFields: {
              likes: { $size: "$likes" },
            },
          },
          // {
          //   $project: {
          //     likes: 1,
          //   },
          // },
        ],
      },
    },
    {
      $lookup: {
        from: "tweets",
        foreignField: "owner",
        localField: "_id",
        as: "tweets",
        pipeline: [
          {
            $lookup: {
              from: "likes",
              foreignField: "tweet",
              localField: "_id",
              as: "likes",
            },
          },
          {
            $addFields: {
              likes: { $size: "$likes" },
            },
          },
          // {
          //   $project: {
          //     likes: 1,
          //   },
          // },
        ],
      },
    },
    {
      $lookup: {
        from: "comments",
        foreignField: "owner",
        localField: "_id",
        as: "comments",
        pipeline: [
          {
            $lookup: {
              from: "likes",
              foreignField: "comment",
              localField: "_id",
              as: "likes",
            },
          },
          {
            $addFields: {
              likes: { $size: "$likes" },
            },
          },
          // {
          //   $project: {
          //     likes: 1,
          //   },
          // },
        ],
      },
    },
    {
      $lookup: {
        from: "subscribers",
        foreignField: "channel",
        localField: "_id",
        as: "subscribers",
      },
    },
    {
      $addFields: {
        totalVideos: { $size: "$videos" },
        totalViews: { $sum: "$videos.views" },
        totalSubscribers: { $size: "$subscribers" },
        videoLikes: { $sum: "$videos.likes" },
        totalComments: { $size: "$comments" },
        commentLikes: { $sum: "$comments.likes" },
        totalTweets: { $size: "$tweets" },
        tweetLikes: { $sum: "$tweets.likes" },
      },
    },
    {
      $addFields: {
        totalLikes: {
          $add: ["$videoLikes", "$commentLikes", "$tweetLikes"],
        },
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        avatar: 1,
        coverImage: 1,

        // videos: 1,
        // tweets: 1,
        // comments: 1,

        totalVideos: 1,
        totalViews: 1,
        totalSubscribers: 1,
        videoLikes: 1,
        totalComments: 1,
        commentLikes: 1,
        totalTweets: 1,
        tweetLikes: 1,
        totalLikes: 1,
      },
    },
  ]);

  if (!channelStats.length) {
    throw new ApiError(404, "Channel not found!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channelStats, "Channel stats fetched successfully.")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const { channelId } = req.query;

  if (!channelId) {
    throw new ApiError(400, "Channel id is required!");
  }
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id!");
  }

  const videos = await Video.find({
    $and: [
      { owner: new mongoose.Types.ObjectId(channelId) },
      { isPublished: true },
    ],
  });

  // if (!videos.length) {
  //   throw new ApiError(404, "Channel not found!");
  // }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully."));
});

export { getChannelStats, getChannelVideos };
