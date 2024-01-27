import { app } from "./app";
import connectDB from "./utils/db/mongo";
import { cloudinaryConfig, port } from "./utils/globalCostants";
import cloudinary from "cloudinary";

// cloudinary configuration
cloudinary.v2.config(cloudinaryConfig);

app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
    connectDB();
})