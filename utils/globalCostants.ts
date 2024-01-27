require("dotenv").config();
import cloudinary from "cloudinary";

//port
export const port = process.env.PORT || 8000;

// cloudinary
export const cloudinaryConfig: cloudinary.ConfigOptions = {
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env?.CLOUD_SECRECT_KEY
}

//db
export const mongoUrl: string = process.env.MONGO_URL || "";
export const redisUrl = process.env.REDIS_URL;

// allowed origins
export const ORIGINS = process.env.ORIGIN || [""] as string[];

// activation secrect
export const activationSecrect = process.env.ACTIVATION_SECRECT || "";

// token expiry
export const activationTokenExpiry = process.env.ACTIVATION_TOKEN_EXPIRY || '5m';
export const accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY || '5';
export const refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '3';




// token
export const accessTokenSecrect = process.env.ACCESS_TOKEN_SECRECT || "";
export const refreshTokenSecrect = process.env.REFRESH_TOKEN_SECRECT || "";

