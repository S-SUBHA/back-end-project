import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
// import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { asyncHandler } from "../utils/AsyncHandler.util.js";

const createTweet = asyncHandler(async (req, res) => {
  // get the content of the tweet from the req.body
  // get the owner from the req.user(auth middleware)
  // create an entry in the db with the input data
  // return the created tweet

  //TODO: create tweet

  const { content } = req.body;
  if (!content) {
    throw new ApiError(
      400,
      "INSUFFICIENT INPUT: Content of the tweet is required!"
    );
  }

  const tweet = await Tweet.create({
    content,
    owner: new mongoose.Types.ObjectId(req.user._id),
  });

  if (!tweet) {
    throw new ApiError(
      500,
      "Something went wrong while saving the tweet in the database!"
    );
  }

  return res
    .status(201)
    .json(new ApiResponse(200, tweet, "Tweet created successfully."));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // get the userId from req.params
  // get the tweets from db using the userId
  // return the tweets

  // TODO: get user tweets

  const { userId } = req.params;
  if (!userId) {
    throw new ApiError(400, "User id is required!");
  }
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Improper user id!");
  }

  const tweets = await Tweet.find({
    owner: new mongoose.Types.ObjectId(userId),
  });

  if (!tweets.length) {
    throw new ApiError(404, "No tweets found by the user!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully!"));
});

const updateTweet = asyncHandler(async (req, res) => {
  // get the tweetId from the req.params
  // query the tweet from the db using the tweet id
  // check if the logged in user is the owner of the tweet
  // get the updated content form the req.body
  // update the tweet and save it on the db
  // return the updated tweet

  //TODO: update tweet

  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError(400, "Tweet id is required!");
  }
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Improper tweet id!");
  }

  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "New content is required to update the tweet!");
  }

  const tweet = await Tweet.findById(new mongoose.Types.ObjectId(tweetId));

  if (!tweet) {
    throw new ApiError(404, "Tweet not found!");
  }

  if (!req.user._id.equals(tweet.owner)) {
    throw new ApiError(
      400,
      "UNAUTHORIZED REQUEST: Only owner of the tweet can update the tweet!"
    );
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    new mongoose.Types.ObjectId(tweet._id),
    { content },
    { new: true }
  );

  if (!updatedTweet) {
    throw new ApiError(
      500,
      "Something went wrong while saving the updated tweet in the database!"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedTweet, "Successfully updated the tweet.")
    );
});

const deleteTweet = asyncHandler(async (req, res) => {
  // get the tweetId from the req.params
  // query from the db for the tweet using the tweetId
  // check if the logged in user is the owner of the tweet
  // delete the tweet form the db
  // return the deleted tweet

  //TODO: delete tweet

  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError(400, "Tweet id is required!");
  }
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Improper tweet id!");
  }

  const tweet = await Tweet.findById(new mongoose.Types.ObjectId(tweetId));

  if (!tweet) {
    throw new ApiError(404, "Tweet not found!");
  }

  if (!req.user._id.equals(tweet.owner)) {
    throw new ApiError(
      400,
      "UNAUTHORIZED REQUEST: Only owner of the tweet can delete the tweet!"
    );
  }

  const deletedTweet = await Tweet.findByIdAndDelete(
    new mongoose.Types.ObjectId(tweet._id)
  );

  if (!deletedTweet) {
    throw new ApiError(
      500,
      "Something went wrong while deleting the tweet from the database!"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedTweet, "Successfully deleted the tweet.")
    );
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
