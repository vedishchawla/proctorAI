import mongoose, { Schema, Document } from "mongoose";
import type { IViolation } from "@/types";

export interface ViolationDocument extends Omit<IViolation, "_id">, Document {}

const ViolationSchema = new Schema<ViolationDocument>(
    {
        sessionId: {
            type: String,
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: [
                "no_face",
                "multiple_faces",
                "gaze_away",
                "head_turned",
                "audio_speech",
                "audio_noise",
                "tab_switch",
                "clipboard_use",
                "idle_timeout",
                "right_click",
                "window_resize",
            ],
            required: true,
        },
        severity: {
            type: String,
            enum: ["info", "low", "medium", "high", "critical"],
            default: "low",
        },
        channels: [
            {
                type: String,
                enum: ["face", "gaze", "headPose", "audio", "interaction"],
            },
        ],
        scores: {
            type: Map,
            of: Number,
            default: new Map(),
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        duration: {
            type: Number,
        },
        description: {
            type: String,
            required: true,
        },
        adminAction: {
            type: String,
            enum: ["pending", "dismissed", "confirmed", "warned", "exam_ended"],
            default: "pending",
        },
        adminNote: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for querying violations by session + time
ViolationSchema.index({ sessionId: 1, timestamp: -1 });
ViolationSchema.index({ severity: 1 });

export default mongoose.models.Violation || mongoose.model<ViolationDocument>("Violation", ViolationSchema);
