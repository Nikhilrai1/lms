import express from "express";
import { editCourse, getAllCourse, getCourseByUser, getSingleCourse, uploadCourse } from "../controllers/course.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
const courseRouter = express.Router();


courseRouter.post("/create-course", isAuthenticated, authorizeRoles("admin"), uploadCourse);
courseRouter.put("/edit-course/:id", isAuthenticated, authorizeRoles("admin"), editCourse);
courseRouter.get("/get-course/:id", getSingleCourse);
courseRouter.get("/get-all-course", getAllCourse);
courseRouter.get("/get-course-content/:id", isAuthenticated, getCourseByUser);













export default courseRouter;