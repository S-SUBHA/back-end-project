import { asyncHandler } from "../utils/AsyncHandler.util.js";
import { ApiError } from "../utils/ApiError.util.js";
import { User } from "../models/user.model.js";
import {
  deleteFileFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import jwt from "jsonwebtoken";
import { CLOUDINARY_FOLDER_PATH } from "../constants.js";

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    // 4. create accessToken and refreshToken
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    // 5. store refreshToken to db
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Error occured while generating accessToken or refreshToken!"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // step-1: get user details, that required to be stored from 'req'
  const { username, email, fullName, password } = req.body;
  // console.log("email: ", email);

  // step-2: validate/ check the data for non-empty and types
  if (
    [username, email, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(
      400,
      "Values in all required fields have not been entered properly!"
    );
  }

  // 3: check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser && existingUser.email === email) {
    throw new ApiError(
      409,
      "It seems user is already registered, try logging in!"
    );
  }

  if (existingUser && existingUser.username === username) {
    throw new ApiError(409, "Username is already taken, try a new one!");
  }

  // if (existingUser) {
  //   throw new ApiError(
  //     409,
  //     "User already exists with the same 'username' or 'email'"
  //   );
  // }

  // 4: check for images, avtar is required
  // console.log(req.body);
  // console.log(req.files);

  // const avatarLocalFilePath = req.files?.avatar[0].path;
  // const coverImageLocalFilePath = req.files?.coverImage[0].path;

  // if (!avatarLocalFilePath) {
  //   throw new ApiError(400, "Avatar is required!");
  // }

  let avatarLocalFilePath = "";
  let coverImageLocalFilePath = "";

  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalFilePath = req.files.avatar[0].path;
  } else {
    throw new ApiError(400, "Avatar is required!");
  }

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalFilePath = req.files.coverImage[0].path;
  }

  // 5: upload to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalFilePath);
  // const coverImage = await uploadOnCloudinary(coverImageLocalFilePath);
  let coverImage = "";
  if (coverImageLocalFilePath) {
    coverImage = await uploadOnCloudinary(coverImageLocalFilePath);
  }

  // 6: check if uploading to cloudinary is successful and if it returns required response
  if (!avatar) {
    throw new ApiError(400, "Avatar is required!");
  }

  // 7: store the user in the database
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // 8: check if the storing of user in db is succesful
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(
      500,
      "Something went wrong while storing the user to the database!"
    );
  }

  // 9: return response to user/ frontend
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // 1. get data(username/ email, password) form req.body
  // 2. find user
  // 3. check for password match
  // 4. create accessToken and refreshToken
  // 5. store refreshToken to db
  // 6. store accessToken and refreshToken in cookie and send the cookie to the user

  // 1. get data(username/ email, password) form req.body
  // console.log(req.body);
  const { username, email, password } = req.body;

  // console.log(username, email);

  if (!username && !email) {
    throw new ApiError(400, "Username or Email is required!");
  }
  // 2. find user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(
      404,
      "No user found corresponding to the username or email!"
    );
  }
  // 3. check for password match
  const passwordCheck = await user.isPasswordCorrect(password);

  if (!passwordCheck) {
    throw new ApiError(401, "Invalid credentials!! Incorrect Password!");
  }
  // 4. create accessToken and refreshToken
  // 5. store refreshToken to db
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);
  // 6. store accessToken and refreshToken in cookie and send the cookie to the user
  user.password = undefined;
  // console.log(user);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user,
          accessToken,
          refreshToken,
        },
        "User logged in sucessfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // 1. get accessToken from req, cookie
  // 2. verify user
  // the above mentioned tasks are delegated to the middleware named auth.middleware.js
  // which add the user (loggedin user) to req

  // 3. clear tokens from db and cookies
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: "" },
    },
    {
      new: true,
    }
  );
  // console.log(user);

  if (!user) {
    throw new ApiError(
      500,
      "User logout couldnot be done successfully, try again!"
    );
  }

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out sucessfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    // 1. get the refreshToken from cookies or req-body
    // 2. verify the refreshToken using jwt
    // 3. generate a pair of new tokens
    // 4. update the refreshToken in the db
    // 5. update the tokens in the cookies and send a sucess res

    // 1. get the refreshToken from cookies or req-body
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unaouthorized request!");
    }
    // 2. verify the refreshToken using jwt
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    // console.log(decodedToken);

    // if (!decodedToken) {
    //   throw new ApiError(401, "Invalid credentials!");
    // }
    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, "Invalid refreshToken!");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Invalid credentials!");
    }
    // 3. generate a pair of new tokens
    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(decodedToken._id);
    // 4. update the refreshToken in the db
    // already done by the generateAccessTokenAndRefreshToken() mehtod
    // 5. update the tokens in the cookies and send a sucess res
    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken: accessToken,
            refreshToken: refreshToken,
          },
          "Tokens refreshed sucessfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refreshToken!!");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  // check if user is logged in? -> delegate to the 'auth.middleware.js'
  // [optional]: check if 'newPassword' and its confirmation,
  // i.e., 'confirmedPassword' are same
  // find user with the id obtained from the 'req.user'
  // user the 'isPasswordCorrect' method from the user model the check the oldPassword
  // change the password to the newPassword and save it in the db

  const { oldPassword, newPassword, confirmedPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "All the fields are required!");
  }

  if (newPassword != confirmedPassword) {
    throw new ApiError(
      400,
      "Mismatch is found between the newPassword and its confirmation password!"
    );
  }

  const user = await User.findById(req.user?._id);

  const passwordCheck = await user.isPasswordCorrect(oldPassword);

  if (!passwordCheck) {
    throw new ApiError(400, "Invalid old password!");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, ""));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // use 'auth.middleware.js' to check if user is logged in
  // and obtain the req.user object
  // check if either of the fields that is required to be updated is sent or not
  // update the fields that are sent to be updated
  // save the user to the db
  // return the updated user

  const { fullName, email } = req.body;

  if (!fullName && !email) {
    throw new ApiError(400, "Either of fullName and email is required!");
  }

  if (fullName) {
    req.user.fullName = fullName;
  }

  if (email) {
    req.user.email = email;
  }

  await req.user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User details updated!"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  // allow updating file only if user is logged in
  // take the file through 'multer' middleware
  // save the file in cloudinary
  // save the cloudinary-links of the file to the db

  const avatarLocalFilePath = req.file?.path;
  // console.log(req.file);

  if (!avatarLocalFilePath) {
    throw new ApiError(400, "Avatar is missing!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalFilePath);
  // console.log(avatar);

  if (!avatar.url) {
    throw new ApiError(
      500,
      "Something went wrong while updating the avatar! Please try again!"
    );
  }

  const oldAvatar = req.user?.avatar;
  const oldAvatarPublicId =
    CLOUDINARY_FOLDER_PATH +
    "/" +
    oldAvatar.split(/\//).slice(-1)[0].split(/\./)[0];
  // console.log(oldAvatarPublicId);

  req.user.avatar = avatar.url;
  await req.user.save({ validateBeforeSave: false });
  // console.log(req.user);

  if (oldAvatarPublicId) await deleteFileFromCloudinary(oldAvatarPublicId);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { avatarLink: req.user.avatar },
        "Avatar updated successfully"
      )
    );
});

const updateCoverImage = asyncHandler(async (req, res) => {
  // allow updating file only if user is logged in
  // take the file through 'multer' middleware
  // save the file in cloudinary
  // save the cloudinary-links of the file to the db

  const coverImageLocalFilePath = req.file?.path;

  if (!coverImageLocalFilePath) {
    throw new ApiError(400, "CoverImage is missing!");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalFilePath);

  if (!coverImage.url) {
    throw new ApiError(
      500,
      "Something went wrong while updating the coverImage! Please try again!"
    );
  }

  const oldCoverImage = req.user?.coverImage;
  const oldCoverImagePublicId =
    CLOUDINARY_FOLDER_PATH +
    "/" +
    oldCoverImage.split(/\//).slice(-1)[0].split(/\./)[0];

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { coverImage: coverImage.url },
    },
    { new: true }
  ).select("-password");

  if (oldCoverImagePublicId)
    await deleteFileFromCloudinary(oldCoverImagePublicId);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { coverImageLink: user.coverImage },
        "CoverImage updated successfully"
      )
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  // 1. get the username of the user whose channel is being visited, likely to get from params
  // 2. write aggregation pipelines to obtain the following details of the channel owner,
  // in oreder to populate the profile/ channel page with the values
  // a. avatar
  // b. coverImage
  // c. username
  // d. fullName
  // e. subscribers
  // f. subscribed (channels that the owner of the current channel follows)
  // g. isFllowed (a boolean value)
  // (check whether the visiting user is subscribed to the visited channel)

  const channelOwnerUsername = req.params?.username;
  // console.log(channelOwnerUsername);

  if (!channelOwnerUsername) {
    throw new ApiError(404, "Channel to visit is not specified!");
  }

  const channelDetails = await User.aggregate([
    {
      $match: { username: channelOwnerUsername?.toLowerCase() },
    },
    {
      $lookup: {
        from: "subscriptions",
        foreignField: "channel",
        localField: "_id",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        foreignField: "subscriber",
        localField: "_id",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        channelsSubscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: { $in: [req.user?._id, "$subscribers.subscriber"] },
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);
  // console.log("channelDetails: ", channelDetails);

  if (!channelDetails.length) {
    throw new ApiError(404, "Channel not found!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelDetails[0],
        "Chennel details fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
};
