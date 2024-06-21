import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { asyncHandler } from "../utils/AsyncHandler.util.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  // check in the db/subscriptions for a subscription object corresponding to the input combination, i.e., subscriber = req.user._id && channel = channelId
  // if found: delete the entry from the db
  // else: create an entry in the db according to the request

  const { channelId } = req.params;
  // TODO: toggle subscription

  if (!channelId) {
    throw new ApiError(400, "INSUFFICIENT INPUT: Channel id is required!");
  }

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "INVALID INPUT: Channel id is invalid!");
  }

  const oldSubscription = await Subscription.findOne({
    $and: [
      { subscriber: new mongoose.Types.ObjectId(req.user._id) },
      { channel: new mongoose.Types.ObjectId(channelId) },
    ],
  });

  let newSubscription = null;

  if (!oldSubscription) {
    newSubscription = await Subscription.create({
      subscriber: new mongoose.Types.ObjectId(req.user._id),
      channel: new mongoose.Types.ObjectId(channelId),
    });
  } else {
    await Subscription.findByIdAndDelete(oldSubscription._id);
  }

  if (!oldSubscription && !newSubscription) {
    throw new ApiError(
      500,
      "Something went wrong while creating the requested subscription!"
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      // oldSubscription || newSubscription,
      { oldSubscription, newSubscription },
      "Subscription status toggled successfully."
    )
  );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) {
    throw new ApiError(400, "INSUFFICIENT INPUT: Channel id is required!");
  }

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "INVALID INPUT: Improper channel id!");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: { channel: new mongoose.Types.ObjectId(channelId) },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "subscriber",
        as: "subscriber",
        pipeline: [
          {
            $project: {
              _id: 0,
              username: 1,
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        subscriber: {
          $first: "$subscriber",
        },
      },
    },
    {
      $project: {
        subscriber: 1,
        createdAt: 1,
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscribers,
        subscriberCount: subscribers.length,
      },
      "Subscribers fetched successfully!"
    )
  );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!subscriberId) {
    throw new ApiError(400, "INSUFFICIENT INPUT: Channel id is required!");
  }

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "INVALID INPUT: Improper channel id!");
  }

  const channels = await Subscription.aggregate([
    {
      $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "channel",
        as: "channel",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              foreignField: "channel",
              localField: "_id",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscriberCount: { $size: "$subscribers" },
            },
          },
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
              subscriberCount: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        channel: {
          $first: "$channel",
        },
      },
    },
    {
      $project: {
        channel: 1,
        createdAt: 1,
      },
    },
  ]);

  // find({
  //   subscriber: new mongoose.Types.ObjectId(subscriberId),
  // }).select("-channel -_id -updatedAt -__v");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        channels,
        channelsCount: channels.length,
      },
      "Channels fetched successfully!"
    )
  );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
