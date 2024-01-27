import mongoose from "mongoose";
import { mongoUrl } from "../globalCostants";


const connectDB = async () => {
    try {
        await mongoose.connect(mongoUrl).then((data) => {
            console.log(`Database connected with ${data.connection.host}`)
        })
    } catch (error: any) {
        console.log(error);
        setTimeout(connectDB, 5000)
    }
}
export default connectDB;