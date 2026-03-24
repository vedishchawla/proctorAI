import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Session from "@/models/Session";

// GET /api/sessions — List sessions (active or all)
export async function GET(request: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const examId = searchParams.get("examId");
        const status = searchParams.get("status");
        const userId = searchParams.get("userId");

        const filter: Record<string, unknown> = {};
        if (examId) filter.examId = examId;
        if (status) filter.status = status;
        if (userId) filter.userId = userId;

        const sessions = await Session.find(filter)
            .sort({ startTime: -1 })
            .lean();

        return NextResponse.json({ sessions }, { status: 200 });
    } catch (error) {
        console.error("Get sessions error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/sessions — Start new exam session
export async function POST(request: Request) {
    try {
        await connectDB();
        const body = await request.json();
        const { examId, userId, userName, userEmail } = body;

        if (!examId || !userId) {
            return NextResponse.json(
                { error: "examId and userId are required" },
                { status: 400 }
            );
        }

        // Check for existing active session
        const existing = await Session.findOne({
            examId,
            userId,
            status: { $in: ["calibrating", "active"] },
        });

        if (existing) {
            return NextResponse.json({ session: existing }, { status: 200 });
        }

        const session = await Session.create({
            examId,
            userId,
            userName: userName || "",
            userEmail: userEmail || "",
            trustScore: 100,
            status: "calibrating",
            answers: {},
            totalViolations: 0,
        });

        return NextResponse.json({ session }, { status: 201 });
    } catch (error) {
        console.error("Create session error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
