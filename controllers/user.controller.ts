import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import userModel, { IUser } from "../models/user.model";
import { ErrorHandler } from "../utils/errors/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { accessTokenExpiry, accessTokenSecrect, activationSecrect, activationTokenExpiry, refreshTokenExpiry, refreshTokenSecrect } from "../utils/globalCostants";
import sendMail from "../mails/sendMail";
import { accessTokenOptions, refreshTokenOptions, sendToken } from "../utils/jwt/jwt";
import { redis } from "../utils/db/redis";
import { RequestWithUser } from "../middleware/auth";
import { getUserById } from "../services/user.services";
import cloudinary from "cloudinary";


// registration
interface IRegistrationBody {
    name: string;
    email: string;
    password: string;
    avatarUrl?: string;
}

export const registrationUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.body;

        const isEmailExist = await userModel?.findOne({ email });
        console.log(isEmailExist)
        if (isEmailExist) {
            return next(new ErrorHandler("Email already exists", 400));
        }

        const user: IRegistrationBody = {
            name,
            email,
            password,
        }

        const activationToken = createActivationToken(user);
        const activationCode = activationToken.activationCode;

        const data = { user: { name: user.name }, activationCode };

        try {
            await sendMail({
                data,
                email,
                subject: "Activate your account",
                template: "activation-mail.ejs"
            })

            res.status(201).json({
                success: true,
                message: `please check your email: ${user.email} to activate your account`,
                activationCode: activationToken.token
            })
        } catch (error: any) {
            console.log("mailerror", error)
            return next(new ErrorHandler(error.message, 400));
        }

    } catch (error: any) {
        console.log(error)
        return next(new ErrorHandler(error.message, 400))
    }

})

interface IActivationToken {
    token: string;
    activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = jwt.sign({
        user,
        activationCode,
    }, activationSecrect, {
        expiresIn: activationTokenExpiry
    })

    return { token, activationCode }

}


// activate user 
interface IActivationRequest {
    activation_token: string;
    activation_code: string;
}


export const activateUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { activation_token, activation_code } = req.body as IActivationRequest;

        if (!activation_token || !activation_code) {
            return next(new ErrorHandler("Required activation token and activation code", 400));
        }

        const newUser: { user: IUser, activationCode: string } = jwt.verify(activation_token, activationSecrect) as { user: IUser; activationCode: string };


        if (newUser?.activationCode !== activation_code) {
            return next(new ErrorHandler("Activation code invalid", 400));
        }


        const { name, email, password } = newUser.user;

        const existUser = await userModel.findOne({ email });
        if (existUser) {
            return next(new ErrorHandler("Email already exist", 400));
        }

        const user = await userModel.create({
            name,
            email,
            password
        })

        if (!user) {
            return next(new ErrorHandler("Cannot activate account", 400))
        }

        res.status(201).json({
            success: true,
            message: "Account verification successfully."
        })


    } catch (error: any) {
        console.log(error)
        next(new ErrorHandler(error?.message, 400))
    }
})

// login user
interface ILoginRequest {
    email: string;
    password: string;
}

export const loginUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body as ILoginRequest;

        if (!email || !password) {
            return next(new ErrorHandler("Please enter email and password", 400))
        }

        const user = await userModel.findOne({ email }).select("+password");

        if (!user) {
            return next(new ErrorHandler("Invalid email or password", 400));
        }

        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return next(new ErrorHandler("Invalid email or password", 400))
        }

        sendToken(user, 200, res)

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }

})


// logout user
export const logoutUser = CatchAsyncError(async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
        res.cookie("access_token", "", { maxAge: 1 });
        res.cookie("refresh_token", "", { maxAge: 1 });
        const userId = req.user?._id || "";
        await redis.del(userId)
        res.status(200).json({
            success: true,
            message: "Logout successfully."
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }

})


// update access token
export const updateAccessToken = CatchAsyncError(async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
        const refresh_token = req.cookies?.refresh_token as string;
        const decoded = jwt.verify(refresh_token, refreshTokenSecrect) as JwtPayload;

        if (!decoded) {
            return next(new ErrorHandler("Could not refresh token", 400));
        }

        const session = await redis.get(decoded?.id as string);

        if (!session) {
            return next(new ErrorHandler("Could not refresh token", 400));
        }

        const user = JSON.parse(session);
        const accessToken = jwt.sign({ id: user?._id }, accessTokenSecrect, {
            expiresIn: `${accessTokenExpiry}m`
        })

        const refreshToken = jwt.sign({ id: user?._id }, refreshTokenSecrect, {
            expiresIn: `${refreshTokenExpiry}d`
        })

        req.user = user;

        res.cookie("access_token", accessToken, accessTokenOptions);
        res.cookie("refresh_token", refreshToken, refreshTokenOptions);

        res.status(200).json({
            status: "success",
            accessToken,
            refreshToken
        })
    } catch (error: any) {
        console.log("updateAccess token", error)
        return next(new ErrorHandler(error.message, 400))
    }

})

// get user info
export const getUserInfo = CatchAsyncError(async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        getUserById(userId, res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})


interface ISocialAuthBody {
    email: string;
    name: string;
    avatar: string;
}

// social auth
export const socialAuth = CatchAsyncError(async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
        const { email, name, avatar } = req.body as ISocialAuthBody;
        const user = await userModel.findOne({ email });
        if (!user) {
            const newUser = await userModel.create({ email, name, avatar });
            sendToken(newUser, 200, res);
        }
        else {
            sendToken(user, 200, res);
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

// update user info
interface IUpdateUserInfo {
    name?: string;
    email?: string;
}


export const updateUserInfo = CatchAsyncError(async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
        const { email, name } = req.body as IUpdateUserInfo;
        const userId = req.user?._id;
        const user = await userModel.findById(userId);

        if (email && user) {
            const isEmailExist = await userModel.findOne({ email });

            if (isEmailExist) {
                return next(new ErrorHandler("Email already exists", 400));
            }
            user.email = email;
        }

        if (name && user) {
            user.name = name;
        }

        await user?.save();
        await redis.set(userId, JSON.stringify(user));
        res.status(201).json({
            success: true,
            user
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})


// update user password
interface IUpdatePassword {
    oldPassword: string;
    newPassword: string;
}

export const updatePassword = CatchAsyncError(async (req: RequestWithUser, res: Response, next: NextFunction) => {

    try {
        const { oldPassword, newPassword } = req.body as IUpdatePassword;

        if (!oldPassword || !newPassword) {
            return next(new ErrorHandler("Required old and new password.", 400));
        }

        const user = await userModel.findById(req.user?._id).select("+password");
        console.log("user pa", user)
        if (!user?.password) {
            return next(new ErrorHandler("Invalid user", 400));
        }
        const isPasswordMatch = await user?.comparePassword(oldPassword);
        console.log("match", isPasswordMatch)
        if (!isPasswordMatch) {
            return next(new ErrorHandler("Invalid old password", 400));
        }
        user.password = newPassword;

        await user.save();
        await redis.set(req?.user?._id, JSON.stringify(user));

        return res.status(201).json({
            success: true,
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})


// update profile picture
export const updateProfilePicture = CatchAsyncError(async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
        const { avatar } = req.body;

        const user = await userModel.findById(req?.user?._id);
        const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150
        });


        if (avatar && user) {
            if (user?.avatar?.public_id) {
                await cloudinary?.v2.uploader.destroy(user?.avatar?.public_id);
                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150
                });

                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                }
            }
            else {
                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150
                });

                console.log("myCloud",myCloud)

                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                }
            }
        }
        await user?.save();
        await redis.set(req?.user?._id, JSON.stringify(user));
        res.status(201).json({
            success: true,
            user
        })

    } catch (error: any) {
        console.log(JSON.stringify(error))
        return next(new ErrorHandler(JSON.stringify(error), 400));
    }
})


