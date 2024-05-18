import { asyncHandler } from "../utils/AsyncHandler.util.js";
import { ApiError } from "../utils/ApiError.util.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import jwt from "jsonwebtoken";

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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
