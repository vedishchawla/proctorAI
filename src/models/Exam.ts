import mongoose, { Schema, Document } from "mongoose";
import type { IExam, IQuestion, IExamSettings, ITestCase } from "@/types";

export interface ExamDocument extends Omit<IExam, "_id">, Document {}

const TestCaseSchema = new Schema<ITestCase>(
    {
        input: { type: String, required: true },
        expectedOutput: { type: String, required: true },
        isHidden: { type: Boolean, default: false },
    },
    { _id: false }
);

const QuestionSchema = new Schema<IQuestion>(
    {
        id: { type: String, required: true },
        text: { type: String, required: true },
        type: { type: String, enum: ["mcq", "coding"], default: "mcq" },
        // MCQ fields
        options: [{ type: String }],
        correctAnswer: { type: Number },
        // Coding fields
        starterCode: { type: Schema.Types.Mixed },
        testCases: [TestCaseSchema],
        languages: [{ type: String }],
        // Common
        points: { type: Number, default: 1 },
    },
    { _id: false }
);

const ExamSettingsSchema = new Schema<IExamSettings>(
    {
        webcamRequired: { type: Boolean, default: true },
        audioRequired: { type: Boolean, default: true },
        tabSwitchLimit: { type: Number, default: 3 },
        autoSubmitOnCritical: { type: Boolean, default: true },
        calibrationDuration: { type: Number, default: 30 },
    },
    { _id: false }
);

const ExamSchema = new Schema<ExamDocument>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        questions: {
            type: [QuestionSchema],
            default: [],
        },
        duration: {
            type: Number,
            required: true,
            min: 1,
        },
        settings: {
            type: ExamSettingsSchema,
            default: () => ({}),
        },
        createdBy: {
            type: String,
            required: true,
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.Exam || mongoose.model<ExamDocument>("Exam", ExamSchema);
