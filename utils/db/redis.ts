import { Redis } from "ioredis";
import { redisUrl } from "../globalCostants";


const redisClient = () => {
    if (redisUrl) {
        console.log("Redis Connected");
        return redisUrl;
    }
    throw new Error("Redis connection failed");
}


export const redis = new Redis(redisClient());