import { asyncHandler } from "../utils/AsyncHandler.util.js";

const registerUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    message: "ok",
  });
});

export { registerUser };
