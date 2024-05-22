import { Router } from "express";
import {
  changePassword,
  getCurrentUser,
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
userRouter.route("/change-password").post(verifyJWT, changePassword);
userRouter.route("/get-current-user").get(verifyJWT, getCurrentUser);
userRouter
  .route("/update-account-details")
  .post(verifyJWT, updateAccountDetails);
userRouter
  .route("/update-avatar")
  .post(verifyJWT, upload.single("avatar"), updateAvatar);
userRouter
  .route("/update-cover-image")
  .post(verifyJWT, upload.single("coverImage"), updateCoverImage);

export default userRouter;
