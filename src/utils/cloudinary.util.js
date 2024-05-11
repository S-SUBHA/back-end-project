import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

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

export { uploadOnCloudinary };
