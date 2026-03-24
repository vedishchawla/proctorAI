import mongoose, { Schema, Document } from "mongoose";
import type { IUser } from "@/types";

export interface UserDocument extends Omit<IUser, "_id">, Document {}

const UserSchema = new Schema<UserDocument>(
    {
        firebaseUID: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        avatar: {
            type: String,
            default: "",
        },
        role: {
            type: String,
            enum: ["admin", "student"],
            default: "student",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);
