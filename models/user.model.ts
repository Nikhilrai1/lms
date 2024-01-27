import mongoose, { Model, Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { accessTokenExpiry, accessTokenSecrect, refreshTokenSecrect } from "../utils/globalCostants";


const validateEmail = (value: string) => {
    const emailRegexPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegexPattern.test(value);
}

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    avatar: {
        public_id: string;
        url: string;
    },
    role: string;
    isVerified: boolean;
    courses: Array<{ courseId: string }>;
    comparePassword: (password: string) => Promise<boolean>;
    SignAccessToken: () => string;
    SignRefreshToken: () => string;
}

const userSchema: Schema<IUser> = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please eneter your name"]
    },
    email: {
        type: String,
        required: [true, "Please eneter your email"],
        validate: {
            validator: validateEmail
        },
        unique: true
    },
    password: {
        type: String,
        required: [true, "Please eneter your password"],
        minLength: [6, "Password must be at least 6 characters"],
        select: false
    },

    avatar: {
        public_id: String,
        url: String,
    },
    role: {
        type: String,
        default: "user",
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    courses: [
        {
            courseId: String
        }
    ]
}, { timestamps: true });

// Hash Password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
})

// sign access token
userSchema.methods.SignAccessToken = function () {
    return jwt.sign({ id: this._id }, accessTokenSecrect,{
        expiresIn: `${accessTokenExpiry}m`
    });
}

// sign refresh token
userSchema.methods.SignRefreshToken = function () {
    return jwt.sign({ id: this._id }, refreshTokenSecrect);
}

// compare password
userSchema.methods.comparePassword = async function (enteredPassword: string): Promise<boolean> {
    return await bcrypt.compare(enteredPassword, this.password);
}

const userModel: Model<IUser> = mongoose.model("User", userSchema);

export default userModel;

