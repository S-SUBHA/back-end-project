import dotenv from "dotenv";
import connectDB from "./db/index.js";
import {app} from "./app.js";

dotenv.config({
  path: "./.env",
});

connectDB();

app.on("error", () => {
  console.error(`Error ${error}`);
  throw error;
});

app.listen(process.env.PORT || 8000, () => {
  console.log(`Server is running on port ${process.env.PORT || 8000}`);
});
