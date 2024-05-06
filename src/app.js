import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { REQ_RATE_LIMIT } from "./constants.js";

const app = express();

// configurations for cors
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }));

// configurations for body-parser
app.use(express.json({limit: REQ_RATE_LIMIT}));
app.use(express.urlencoded({extended: true, limit: REQ_RATE_LIMIT}));

// configurations for cookieParser
app.use(cookieParser());

// import routes
import userRouter from "./routes/user.routes.js";

// declaration of routes
app.use("/api/v1/user",userRouter);

export { app };