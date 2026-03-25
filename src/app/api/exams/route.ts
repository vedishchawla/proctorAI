import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";

export const dynamic = "force-dynamic";

// GET /api/exams — List all exams
export async function GET() {
    try {
        await connectDB();
        const exams = await Exam.find({ isActive: true })
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json({ exams }, { status: 200 });
    } catch (error) {
        console.error("Get exams error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/exams — Create new exam
export async function POST(request: Request) {
    try {
        await connectDB();
        const body = await request.json();
        const { title, description, questions, duration, settings, createdBy } = body;

        if (!title || !duration || !createdBy) {
            return NextResponse.json(
                { error: "title, duration, and createdBy are required" },
                { status: 400 }
            );
        }

        const exam = await Exam.create({
            title,
            description: description || "",
            questions: questions || [],
            duration,
            settings: settings || {},
            createdBy,
        });

        return NextResponse.json({ exam }, { status: 201 });
    } catch (error) {
        console.error("Create exam error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
