import { asyncHandler } from "../utils/AsyncHandler.util.js";
import { ApiError } from "../utils/ApiError.util.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.util.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";

const registerUser = asyncHandler(async (req, res) => {
  // step-1: get user details, that required to be stored from 'req'
  const { username, email, fullName, password } = req.body;
  console.log("email: ", email);

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
  const existingUser = User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser.email === email) {
    throw new ApiError(
      409,
      "It seems user is already registered, try logging in!"
    );
  }

  if (existingUser.username === username) {
    throw new ApiError(409, "Username is already taken, try a new one!");
  }

  // if (existingUser) {
  //   throw new ApiError(
  //     409,
  //     "User already exists with the same 'username' or 'email'"
  //   );
  // }

  // 4: check for images, avtar is required
  const avatarLocalFilePath = req.files?.avatar[0].path;
  const coverImageLocalFilePath = req.files?.coverImage[0].path;

  if (!avatarLocalFilePath) {
    throw new ApiError(400, "Avatar is required!");
  }

  // 5: upload to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalFilePath);
  const coverImage = await uploadOnCloudinary(coverImageLocalFilePath);

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

export { registerUser };
