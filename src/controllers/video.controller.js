import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { asyncHandler } from "../utils/AsyncHandler.util.js";
import { uploadOnCloudinary } from "../utils/cloudinary.util.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  // const { title, description} = req.body
  // TODO: get video, upload to cloudinary, create video

  // get the title, description from req.body
  // get the userId of the loggedin user form req.user (auth middleware)
  // get the video and the thumbnail form the req.files (multer middleware)
  // upload the files to cloudinary
  // get the url and duration from the cloudinary responce
  // create an entry in the database for the uploaded video according to the model

  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(
      400,
      "Both title and description for the video is required!"
    );
  }

  if (
    !(
      req.files &&
      Array.isArray(req.files.video) &&
      req.files.video.length > 0 &&
      Array.isArray(req.files.thumbnail) &&
      req.files.thumbnail.length > 0
    )
  ) {
    throw new ApiError(400, "Both video and the thumbnail is required!");
  }

  const thumbnailLocalFilePath = req.files.thumbnail[0].path;
  const videoLocalFilePath = req.files.video[0].path;

  const thumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);
  const videoFile = await uploadOnCloudinary(videoLocalFilePath);

//   console.log("THUMBNAIL: ", thumbnail, "\n\n", "VIDEOFILE: ", videoFile.audio);

  if (!thumbnail || !videoFile) {
    throw new ApiError(
      500,
      "Something went wrong while uploading the files on Cloudinary!"
    );
  }

  const video = await Video.create({
    video: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: videoFile.duration,
    owner: req.user._id,
  });

  //   console.log("\n\n\n\nVIDEO: ", video);

  if (!video) {
    throw new ApiError(
      500,
      "Something went wrong while storing the data in the database!"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
