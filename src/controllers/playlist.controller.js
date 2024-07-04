import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { asyncHandler } from "../utils/AsyncHandler.util.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  //TODO: create playlist

  if (!name || !description) {
    throw new ApiError(
      400,
      "Name and description for the playlist is required!"
    );
  }

  const playlist = await Playlist.create({
    name,
    description,
    videos: [],
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(200, playlist, "Playlist created successfully!"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists

  if (!userId) {
    throw new ApiError(400, "User id is required!");
  }
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id!");
  }

  const playlists = await Playlist.find({
    owner: new mongoose.Types.ObjectId(userId),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "Playlists fetched successfully."));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id

  if (!playlistId) {
    throw new ApiError(400, "Playlist id is required!");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id!");
  }

  const playlist = await Playlist.findById(
    new mongoose.Types.ObjectId(playlistId)
  );

  if (!playlist) {
    throw new ApiError(404, "Playlist not found!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully."));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!playlistId || !videoId) {
    throw new ApiError(400, "Both playlist id and video id is required!");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id!");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id!");
  }

  // TODO:
  const video = await Playlist.findOne({
    $and: [
      { _id: new mongoose.Types.ObjectId(playlistId) },
      { videos: { $in: [new mongoose.Types.ObjectId(videoId)] } },
    ],
  });

  if (video) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          video,
          "Given video already exists in the playlist."
        )
      );
  }

  const playlist = await Playlist.findByIdAndUpdate(
    new mongoose.Types.ObjectId(playlistId),
    {
      $push: { videos: new mongoose.Types.ObjectId(videoId) },
    },
    { new: true }
  );

  if (!playlist) {
    throw new ApiError(404, "Playlsit not found!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        playlist,
        "Video added to the playlist successfully."
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist

  if (!playlistId) {
    throw new ApiError(400, "Playlist id is required!");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id!");
  }

  if (!videoId) {
    throw new ApiError(400, "Video id is required!");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id!");
  }

  const playlist = await Playlist.findById(
    new mongoose.Types.ObjectId(playlistId)
  );

  if (!playlist) {
    throw new ApiError(404, "Playlist not found!");
  }

  if (!req.user._id.equals(playlist.owner)) {
    throw new ApiError(
      400,
      "UNAUTHORIZED REQUEST: Only owner can modify the playlist!"
    );
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    new mongoose.Types.ObjectId(playlistId),
    { $pull: { videos: new mongoose.Types.ObjectId(videoId) } },
    { new: true }
  );

  if (!updatedPlaylist) {
    throw new ApiError(
      500,
      "Something went wrong while updating the playlist!"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video deleted from the playlist successfully."
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist

  if (!playlistId) {
    throw new ApiError(400, "Playlist id is required!");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id!");
  }

  const playlist = await Playlist.findByIdAndDelete(
    new mongoose.Types.ObjectId(playlistId)
  );

  if (!playlist) {
    throw new ApiError(404, "Playlist not found!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist deleted successfully."));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
  if (!playlistId) {
    throw new ApiError(400, "Playlist id is required!");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id!");
  }

  if (!name || !description) {
    throw new ApiError(
      400,
      "Both name and description for the updated playlist is required!"
    );
  }

  const playlist = await Playlist.findById(
    new mongoose.Types.ObjectId(playlistId)
  );

  if (!playlist) {
    throw new ApiError(404, "Playlist not found!");
  }

  if (!req.user._id.equals(playlist.owner)) {
    throw new ApiError(
      400,
      "UNAUTHORIZED REQUEST: Only owner can modify the playlist!"
    );
  }

  // playlist.name = name;
  // playlist.description = description;

  // await playlist.save();

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    new mongoose.Types.ObjectId(playlist._id),
    { $set: { name, description } },
    { new: true }
  );

  if (!updatedPlaylist) {
    throw new ApiError(
      500,
      "Something went wrong while updating the playlist!"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully.")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
