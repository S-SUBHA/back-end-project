import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.util.js";
import { CLOUDINARY_FOLDER_PATH } from "../constants.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    //upload file to cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: CLOUDINARY_FOLDER_PATH,
    });

    // file has been uploaded on cloudinary succesfully
    // unlink/delete the file from local server
    fs.unlinkSync(localFilePath);
    // console.log("File has been uploaded on cloudinary sucessfully: ", response.url);
    return response;
  } catch (error) {
    //for safe cleaning purpose:
    // remove the locally saved temporary file as the upload has failed
    fs.unlinkSync(localFilePath);

    return null;
  }
};

// update the userController to user the deleteImageFromCloudinary function
const deleteFileFromCloudinary = async (public_id) => {
  try {
    if (!public_id) return null;

    const response = await cloudinary.uploader.destroy(public_id, {
      resource_type: "image",
      invalidate: true,
    });
    // console.log(response);

    return response;
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while deleteing file on Cloudinary!"
    );
  }
};

const deleteImageFromCloudinary = async (fileURL) => {
  try {
    if(typeof(fileURL) != "string") {
      throw new ApiError(400, "Improper URL for the file is sent!");
    }
    const public_id =
      CLOUDINARY_FOLDER_PATH +
      "/" +
      fileURL.split(/\//).slice(-1)[0].split(/\./)[0];

    // console.log(public_id);

    if (!public_id) return null;

    const response = await cloudinary.uploader.destroy(public_id, {
      resource_type: "image",
      invalidate: true,
    });
    // console.log(response);

    return response;
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while deleteing file on Cloudinary!"
    );
  }
};

const deleteVideoFromCloudinary = async (fileURL) => {
  try {
    if(typeof(fileURL) != "string") {
      throw new ApiError(400, "Improper URL for the file is sent!");
    }
    const public_id =
      CLOUDINARY_FOLDER_PATH +
      "/" +
      fileURL.split(/\//).slice(-1)[0].split(/\./)[0];

    // console.log(public_id);

    if (!public_id) return null;

    const response = await cloudinary.uploader.destroy(public_id, {
      resource_type: "video",
      invalidate: true,
    });
    // console.log(response);

    return response;
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while deleteing file on Cloudinary!"
    );
  }
};

export { uploadOnCloudinary, deleteFileFromCloudinary, deleteImageFromCloudinary, deleteVideoFromCloudinary };
