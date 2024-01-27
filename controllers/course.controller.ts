import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import { ErrorHandler } from "../utils/errors/ErrorHandler";
import cloudinary from "cloudinary";
import { createCourse } from "../services/course.service";
import CourseModel from "../models/course.model";
import { redis } from "../utils/db/redis";
import { RequestWithUser } from "../middleware/auth";


// upload course
export const uploadCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        const thumbnail = data?.thumbnail;

        if (thumbnail) {
            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            });

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        }
        createCourse(data, res, next);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
})


// edit course
export const editCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseId = req.params?.id;
        if (!courseId) {
            return next(new ErrorHandler("Required course Id.", 500));
        }

        const data = req.body;
        const thumbnail = data?.thumbnail;

        if (thumbnail && thumbnail?.public_id) {
            await cloudinary.v2.uploader.destroy(thumbnail?.public_id);

            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            });

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        }


        const course = await CourseModel.findByIdAndUpdate(courseId, {
            $set: data,
        }, { new: true });

        res.status(201).json({
            success: true,
            course
        })


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})


// get single course --without purchasing
export const getSingleCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseId = req.params.id;
        const cachedCourse = await redis.get(courseId);

        if (cachedCourse) {
            const course = JSON.parse(cachedCourse);

            res.status(200).json({
                success: true,
                course,
                message: "single course from cache"
            })
        }
        else {
            const course = await CourseModel.findById(courseId).select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
            await redis.set(courseId, JSON.stringify(course))
            res.status(200).json({
                success: true,
                course,
                message: "single course from database"
            })
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})

// get all course --without purchasing
export const getAllCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cachedCourses = await redis.get("allCourses");

        if (cachedCourses) {
            const courses = JSON.parse(cachedCourses);
            res.status(200).json({
                success: true,
                courses,
                message: "all course from cache"
            })
        }
        else {
            const courses = await CourseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");

            await redis.set("allCourses", JSON.stringify(courses));

            res.status(200).json({
                success: true,
                courses,
                message: "all course from database"
            })
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})


// get course content -- only for valid user
export const getCourseByUser = CatchAsyncError(async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
        const userCourseList = req.user?.courses;
        const courseId = req.params.id;

        if (!courseId) {
            return next(new ErrorHandler("Require course ID.",
                400));
        }

        const courseExists = userCourseList?.find((course: any) => course._id.toString() === courseId);

        if (!courseExists) {
            return next(new ErrorHandler("You are not eligible to access this content",
                404));
        }

        const course = await CourseModel.findById(courseId);
        if (!course) {
            return next(new ErrorHandler("course not found",
                404));
        }
        const content = course?.courseData;

        res.status(200).json({
            success: true,
            content
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})