import { ApiError } from "../utils/ApiError.util.js";
import { asyncHandler } from "../utils/AsyncHandler.util.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // 1. get tokens form cookies, if not then from header (Authorization header)
    // 2. verify the token using jwt
    // 3. get user with the userId obtained from the token through db-query
    // 4. update the req object with the queried user
    // 5. call next
  
    // 1. get tokens form cookies, if not then from header (Authorization header)
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
  
    if (!token) {
      throw new ApiError(401, "Unauthorized request!");
    }
    // 2. verify the token using jwt
    const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  
    // console.log(decodedToken);
    // if (!decodedToken) {
    //   throw new ApiError(401, "AccessToken authentication failed!");
    // }
    // 3. get user with the userId obtained from the token through db-query
    const validatedUser = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
  
    if (!validatedUser) {
      throw new ApiError(404, "Invalid credentials!");
    }
    // 4. update the req object with the queried user
    req.user = validatedUser;
    // 5. call next
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Unauthorized request!");
  }
});
