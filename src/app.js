import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { REQ_RATE_LIMIT } from "./constants.js";

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

const app = express();

export { app };
