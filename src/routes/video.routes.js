import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { publishAVideo } from "../controllers/video.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
    {
      name: "video",
      maxCount: 1,
    },
  ]),
  publishAVideo
);

export default router;
