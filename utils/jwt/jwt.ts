require("dotenv").config();
import { Response } from "express";
import { IUser } from "../../models/user.model";
import { accessTokenExpiry, refreshTokenExpiry } from "../globalCostants";
import { redis } from "../db/redis";




interface ITokenOptions {
    expires: Date;
    maxAge: number;
    httpOnly: boolean;
    sameSite: 'lax' | 'strict' | 'none' | undefined;
    secure?: boolean;
}

export const accessTokenOptions: ITokenOptions = {
    expires: new Date(Date.now() + parseInt(accessTokenExpiry) * 60 * 1000),
    maxAge: parseInt(accessTokenExpiry) * 60 * 1000,
    httpOnly: process.env.NODE_ENV === 'production' ? true : false,
    sameSite: 'lax'
}

export const refreshTokenOptions: ITokenOptions = {
    expires: new Date(Date.now() + parseInt(refreshTokenExpiry) * 24 * 60 * 60 * 1000),
    maxAge: parseInt(refreshTokenExpiry) * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
}

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();

    // upload session to redis
    redis.set(user._id, JSON.stringify(user))


    res.cookie("access_token", accessToken, accessTokenOptions);
    res.cookie("refresh_token", refreshToken, refreshTokenOptions);
    res.status(statusCode).json({
        success: true,
        user,
        accessToken,
        refreshToken
    })
}