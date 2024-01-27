
import express, { NextFunction, Request, Response } from 'express';
import cors from "cors";
import cookieParser from "cookie-parser";
import { ORIGINS } from './utils/globalCostants';
import { ErrorMiddleware } from './middleware/error';
import userRouter from './routes/user.route';
import courseRouter from './routes/course.route';

export const app = express();

// body parser 
app.use(express.json({ limit: "50mb" }))
app.use(cookieParser());


app.use(cors({
    origin: ORIGINS
}))


// routes
app.use("/api/v1", userRouter)
app.use("/api/v1", courseRouter)


app.get("/test", (req, res) => {
    res.send("hello")
})


app.all("*", (req: Request, res: Response, next: NextFunction) => {
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.statusCode = 404;
    next(err);

})

// error handling
app.use(ErrorMiddleware)
