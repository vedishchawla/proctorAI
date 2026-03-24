import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Violation from "@/models/Violation";
import Session from "@/models/Session";

// GET /api/violations — List violations (by sessionId)
export async function GET(request: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get("sessionId");
        const severity = searchParams.get("severity");

        const filter: Record<string, unknown> = {};
        if (sessionId) filter.sessionId = sessionId;
        if (severity) filter.severity = severity;

        const violations = await Violation.find(filter)
            .sort({ timestamp: -1 })
            .lean();

        return NextResponse.json({ violations }, { status: 200 });
    } catch (error) {
        console.error("Get violations error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/violations — Record new violation
export async function POST(request: Request) {
    try {
        await connectDB();
        const body = await request.json();
        const { sessionId, type, severity, channels, scores, description, duration } = body;

        if (!sessionId || !type || !description) {
            return NextResponse.json(
                { error: "sessionId, type, and description are required" },
                { status: 400 }
            );
        }

        const violation = await Violation.create({
            sessionId,
            type,
            severity: severity || "low",
            channels: channels || [],
            scores: scores || {},
            description,
            duration,
            adminAction: "pending",
        });

        // Increment violation count on session
        await Session.findByIdAndUpdate(sessionId, {
            $inc: { totalViolations: 1 },
        });

        return NextResponse.json({ violation }, { status: 201 });
    } catch (error) {
        console.error("Create violation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
