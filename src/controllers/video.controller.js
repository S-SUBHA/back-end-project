import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { asyncHandler } from "../utils/AsyncHandler.util.js";
import {
  deleteImageFromCloudinary,
  deleteVideoFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.util.js";

const getAllVideos = asyncHandler(async (req, res) => {
  // get the queries from req.query
  // check the types of the input queries properly and confirm if they are as expected or not before doing any operations using them
  // excecute your aggregation
  // paginate the aggregation response using aggregatePaginate
  // return the response

  // const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  // sortBy options: [title, durartion, views, owner.username]
  // sortType options: [ascending, descending]
  let {
    page = 1,
    limit = 10,
    sortBy,
    sortType,
    userId = undefined,
  } = req.query;

  page = ~~page;
  limit = ~~limit;

  // checks for page and limit
  if (page === 0 || limit === 0) {
    throw new ApiError(
      400,
      "INVALID INPUT: Page and limit both have to be positive integers!"
    );
  }

  // checks for sortBy and sortType
  const sortByOptions = ["title", "duration", "views", "owner.username"];
  const sortTypeOptions = ["ascending", "descending"];

  if (!sortBy || !sortType) {
    throw new ApiError(400, "INSUFFICIENT INPUT: Query is incomplete!");
  }

  if (!sortByOptions.some((op) => op === sortBy)) {
    throw new ApiError(400, "Invalid option to sort by!");
  }

  if (!sortTypeOptions.some((op) => op === sortType)) {
    throw new ApiError(400, "Invalid type for sorting!");
  }

  // checks for userId
  if (userId && !isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id!");
  }

  // Note: mongoose-aggregate-paginate-v2, version: 1.1.1 (version: 1.0.7 is used here) accepts the pipeline directly as well as following
  const aggregationPipeline = {
    _pipeline: [
      // { $match: {owner: userId ? new mongoose.Types.ObjectId(userId) : {$exists: true}}}
      {
        $match: userId
          ? {
              $and: [
                { owner: new mongoose.Types.ObjectId(userId) },
                { isPublished: true },
              ],
            }
          : {
              isPublished: true,
            },
      },
      {
        $lookup: {
          from: "users",
          foreignField: "_id",
          localField: "owner",
          as: "owner",
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          owner: {
            $first: "$owner",
          },
        },
      },
    ],
  };

  // const videos = await Video.aggregate(
  //   [
  //     // { $match: {owner: userId ? new mongoose.Types.ObjectId(userId) : {$exists: true}}}
  //     { $match: userId ?
  //       {
  //         $and: [
  //           {owner: new mongoose.Types.ObjectId(userId)},
  //           {isPublished: true}
  //         ]
  //       } : {
  //         isPublished: true
  //       }
  //     },
  //     {
  //       $sort: {
  //         [sortBy]: sortType === sortTypeOptions[0] ? 1 : -1,
  //         _id: 1
  //       }
  //     },
  //     {
  //       $skip: (page - 1) * limit
  //     },
  //     {
  //       $limit: limit
  //     },
  //     {
  //       $lookup: {
  //         from: "users",
  //         foreignField: "_id",
  //         localField: "owner",
  //         as: "owner",
  //         pipeline: [
  //           {
  //             $project: {
  //               username: 1,
  //               fullName: 1,
  //               avatar: 1,
  //             }
  //           }
  //         ]
  //       }
  //     },
  //     {
  //       $addFields: {
  //         owner: {
  //           $first: "$owner",
  //         }
  //       }
  //     },
  //   ]
  // );

  // return res.json(new ApiResponse(200, videos, "Testing..."));

  // console.log(videos);

  // sortBy = (sortType === sortTypeOptions[0] ? sortBy : "-" + sortBy) + " _id";
  // console.log(sortBy);
  // const paginateOptions = {page, limit, sort: sortBy };
  const paginateOptions = { page, limit, sort: { [sortBy]: sortType, _id: 1 } };

  const paginatedVideos = await Video.aggregatePaginate(
    aggregationPipeline,
    paginateOptions
  );

  if (!paginatedVideos) {
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
        paginatedVideos,
        "Videos fetched and paginated successfully."
      )
    );
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
    .status(201)
    .json(new ApiResponse(200, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if (!videoId) {
    throw new ApiError(400, "Please specify the video to be fetched!");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Improper video id!");
  }

  const video = await Video.findById(
    videoId /*new mongoose.Types.ObjectId(videoId)*/
  );

  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  // get the video from the database using the videoId provided through params
  // check if the logged in user is the owner of the video
  // get the title and description from req.body
  // get the thumnail from req.file (multer middleware)
  // if none of the fields have any data return appropiate error message
  // update (only) the fields that has been requested
  // save the updated (video) document in the db
  // return the updated (video) document

  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail

  if (!videoId) {
    throw new ApiError(400, "Video id is required!");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Improper video id!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video is not found!");
  }

  if (!req.user._id.equals(video.owner)) {
    throw new ApiError(
      400,
      "Bad request! User doesnot own the video and only the owner of the video can update it!"
    );
  }

  const { title, description } = req.body;

  let thumbnailLocalFilePath = null;
  if (req.file) {
    thumbnailLocalFilePath = req.file.path;
  }

  if (!title && !description && !thumbnailLocalFilePath) {
    throw new ApiError(400, "What to update is not specified!");
  }

  if (title) {
    video.title = title;
  }
  if (description) {
    video.description = description;
  }
  if (thumbnailLocalFilePath) {
    const thumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);
    await deleteImageFromCloudinary(video.thumbnail);
    video.thumbnail = thumbnail.url;
  }

  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video details updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  // get the videoId from req.params
  // find the video from the db using the videoId
  // get the video url from the video obtained from db
  // delete the video from cloudinary
  // delete the video from the db

  // note: the order of deletion could be opposite too
  // and that would have required one less query as well,
  // but the reason the behind choosing
  // above mentioned order is to ensure that
  // the video is deleted from cloudinary
  // before deleting the document from the db;

  const { videoId } = req.params;
  //TODO: delete video

  if (!videoId) {
    throw new ApiError(400, "Video id is required!");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Improper video id!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  if (!req.user._id.equals(video.owner)) {
    throw new ApiError(
      401,
      `UNAUTORIZED REQUEST: ${req.user.username} is not the owner of the video!`
    );
  }

  const videoCloudinaryUrl = video.video;
  const thumbnailCloudinaryUrl = video.thumbnail;

  await deleteVideoFromCloudinary(videoCloudinaryUrl);
  await deleteImageFromCloudinary(thumbnailCloudinaryUrl);
  // no need to check if deletion is done properly as the check is being done
  // already, in deleteVidoFromCloudinary

  const deletedVideo = await Video.findOneAndDelete({ _id: video._id });

  if (!deletedVideo) {
    throw new ApiError(
      500,
      "Couldnot delete the video as something went wrong while deleting the video form the db!"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedVideo, "Successfully deleted the video"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  // get the videoId from req.params
  // update the 'isPublished' field of the video document in the db
  // get the updated video document
  // return the updatedVideo

  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video id is required!");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Improper video id!");
  }

  const video = await Video.findOne({ _id: videoId });

  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  if (!req.user._id.equals(video.owner)) {
    throw new ApiError(
      401,
      `UNAUTORIZED REQUEST: ${req.user.username} is not the owner of the video!`
    );
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    video._id,
    { isPublished: !video.isPublished },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(
      500,
      "Something went wrong while updating the document in the database!"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideo,
        "Published status toggled successfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
