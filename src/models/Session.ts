import mongoose, { Schema, Document } from "mongoose";
import type { ISession, CalibrationData } from "@/types";

export interface SessionDocument extends Omit<ISession, "_id">, Document {}

const CalibrationSchema = new Schema<CalibrationData>(
    {
        faceBaseline: {
            x: Number,
            y: Number,
            width: Number,
            height: Number,
        },
        gazeBaseline: {
            leftPupil: { x: Number, y: Number },
            rightPupil: { x: Number, y: Number },
        },
        headPoseBaseline: {
            yaw: Number,
            pitch: Number,
            roll: Number,
        },
        ambientNoiseLevel: Number,
        lightingLevel: Number,
        calibratedAt: Number,
    },
    { _id: false }
);

const SessionSchema = new Schema<SessionDocument>(
    {
        examId: {
            type: String,
            required: true,
            index: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        userName: {
            type: String,
            default: "",
        },
        userEmail: {
            type: String,
            default: "",
        },
        startTime: {
            type: Date,
            default: Date.now,
        },
        endTime: {
            type: Date,
        },
        trustScore: {
            type: Number,
            default: 100,
            min: 0,
            max: 100,
        },
        status: {
            type: String,
            enum: ["calibrating", "active", "paused", "completed", "terminated"],
            default: "calibrating",
        },
        calibrationData: {
            type: CalibrationSchema,
        },
        answers: {
            type: Map,
            of: Number,
            default: new Map(),
        },
        totalViolations: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for quickly finding a user's session for a specific exam
SessionSchema.index({ examId: 1, userId: 1 });

export default mongoose.models.Session || mongoose.model<SessionDocument>("Session", SessionSchema);
