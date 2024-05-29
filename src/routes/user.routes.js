import { Router } from "express";
import {
  changePassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

userRouter.route("/login").post(loginUser);

// secured routes
userRouter.route("/logout").post(verifyJWT, logoutUser);
userRouter.route("/refresh-token").post(refreshAccessToken);
userRouter.route("/change-password").patch(verifyJWT, changePassword);
userRouter.route("/get-current-user").get(verifyJWT, getCurrentUser);
userRouter
  .route("/update-account-details")
  .patch(verifyJWT, updateAccountDetails);
userRouter
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);
userRouter
  .route("/update-cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);
userRouter
  .route("/get-channel-profile/:username")
  .get(verifyJWT, getUserChannelProfile);
userRouter.route("/get-watch-history").get(verifyJWT, getWatchHistory);

export default userRouter;
