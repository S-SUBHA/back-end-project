import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getLikedVideos,
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
} from "../controllers/like.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/v/").get(getLikedVideos);
router.route("/v/:videoId").patch(toggleVideoLike);
router.route("/c/:commentId").patch(toggleCommentLike);
router.route("/t/:tweetId").patch(toggleTweetLike);

export default router;
