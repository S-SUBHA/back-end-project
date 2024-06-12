import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { asyncHandler } from "../utils/AsyncHandler.util.js";

const getVideoComments = asyncHandler(async (req, res) => {
  // get all comments corresponding the videoId
  // paginate them using mongooseAggregatePaginate method
  // return proper response

  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!videoId) {
    throw new ApiError(400, "INSUFFICIENT INPUT: Video is is required!");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "INVALID INPUT: Proper video id is required!");
  }

  const comments = await Comment.aggregate([
    {
      $match: { video: new mongoose.Types.ObjectId(videoId) },
    },
    {
      $project: {
        content: 1,
        video: 1,
        owner: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (!comments.length) {
    throw new ApiError(404, "Video or comments not found!");
  }
  // const customLabels = { pagingCounter: "pageStartingElement" };

  const paginatedComments = await Comment.aggregatePaginate(comments, {
    page,
    limit,
    // customLabels,
  });

  // console.log("\n");
  // console.log(comments);
  // console.log("\n");
  // console.log("..............................................................");
  // console.log("\n");
  // console.log(paginatedComments);
  // console.log("\n");
  // console.log("..............................................................");
  // console.log("\n");
  // throw new ApiError(200, "T...");

  if (!paginatedComments) {
    throw new ApiError(
      500,
      "SERVER ERROR: Something went wrong during pagination!"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        paginatedComments,
        "Comments fetched successfully."
      )
    );
});

const addComment = asyncHandler(async (req, res) => {
  // get the video id from req.params
  // get the content for the comment from the req.body
  // get the owner of the video from req.user (auth middleware)
  // create an entry in the db using the comment model and the relevant data

  // TODO: add a comment to a video

  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "INSUFFICIENT INPUT: Video id is required!");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "INVALID INPUT: Proper video id is required!");
  }

  const { content } = req.body;

  if (!content) {
    throw new ApiError(
      400,
      "INSUFFICIENT INPUT: Content of the comment is required!"
    );
  }

  // const commentOwnerId = req.user._id;

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });

  if (!comment) {
    throw new ApiError(
      500,
      "DATABASE ERROR: Something went wrong while storing the comment in the database!"
    );
  }

  return res
    .status(201)
    .json(new ApiResponse(200, comment, "Comment created successfully."));
});

const updateComment = asyncHandler(async (req, res) => {
  // get the comment id form the req.params
  // get the updated content from req.body
  // patch the data in the db

  // TODO: update a comment

  const { commentId } = req.params;

  if (!commentId) {
    throw new ApiError(400, "INSUFFICIENT INPUT: Video id is required!");
  }

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "INVALID INPUT: Proper video id is required!");
  }

  const { content } = req.body;

  if (!content) {
    throw new ApiError(
      400,
      "INSUFFICIENT INPUT: Content of the comment is required!"
    );
  }

  const comment = await Comment.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(commentId) },
    { content },
    { new: true }
  );

  if (!comment) {
    throw new ApiError(
      500,
      "DATABASE ERROR: Something went wrong while storing the comment in the database!"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully."));
});

const deleteComment = asyncHandler(async (req, res) => {
  // get the comment id from req.params
  // get the logged in user from the req.user(auth middleware)
  // check if the user is the owner of the comment
  // NOTE: here the owner of the video should also be able to delete the comment
  // delete the comment from the db

  // TODO: delete a comment

  const { commentId } = req.params;

  if (!commentId) {
    throw new ApiError(400, "INSUFFICIENT INPUT: Video id is required!");
  }

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "INVALID INPUT: Proper video id is required!");
  }

  const comment = await Comment.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(commentId) },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $project: {
              owner: 1,
            },
          },
        ],
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
        content: 1,
        video: 1,
        owner: 1,
      },
    },
  ]);

  if (!comment.length) {
    throw new ApiError(404, "NOT FOUND: Comment not found!");
  }

  // console.log(comment);
  // throw new ApiError(200, "TESTING...");
  // console.log(req.user._id, "\n", comment[0].owner);

  if (
    !req.user._id.equals(comment[0].owner) &&
    !req.user._id.equals(comment[0].video.owner)
  ) {
    throw new ApiError(
      400,
      "UNAUTHORIZED REQUEST: Logged in user is not the owner of the comment!"
    );
  }

  const deletedComment = await Comment.findByIdAndDelete(
    new mongoose.Types.ObjectId(commentId)
  );
  // console.log(deletedComment);

  if (!deletedComment) {
    throw new ApiError(
      500,
      "Something went wrong while deleting the comment from the database!"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedComment, "Comment deleted successfully.")
    );
});

export { getVideoComments, addComment, updateComment, deleteComment };
