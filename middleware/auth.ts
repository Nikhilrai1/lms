import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "./catchAsyncError";
import { ErrorHandler } from "../utils/errors/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { accessTokenSecrect } from "../utils/globalCostants";
import { redis } from "../utils/db/redis";
import { IUser } from "../models/user.model";


export interface RequestWithUser extends Request {
    user?: IUser
}

// isAuthenticated
export const isAuthenticated = CatchAsyncError(async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const access_token = req.cookies?.access_token;
    if (!access_token) {
        return next(new ErrorHandler("Please login", 400))
    }

    const decoded = jwt.verify(access_token, accessTokenSecrect as string) as JwtPayload;

    if (!decoded) {
        return next(new ErrorHandler("access token invalid", 400));
    }

    const user = await redis.get(decoded.id);

    if (!user) {
        return next(new ErrorHandler("user not found", 400));
    }

    req.user = JSON.parse(user) as IUser;
    next();

})


// validate user role
export const authorizeRoles = (...roles: string[]) => {
    return (req: RequestWithUser, res: Response, next: NextFunction) => {
        console.log("user role",req.user?.role)
        console.log("role",roles.includes(req.user?.role || ""))
        if (!roles.includes(req.user?.role || "")) {
            return next(new ErrorHandler(`Role ${req.user?.role} is not allowed to access this resource`, 403));
        }
        next();
    }
}

