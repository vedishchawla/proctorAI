import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Session from "@/models/Session";

// GET /api/sessions/[id] — Get session details
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;
        const session = await Session.findById(id).lean();

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        return NextResponse.json({ session }, { status: 200 });
    } catch (error) {
        console.error("Get session error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/sessions/[id] — Update session (trust score, status, answers, calibration)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;
        const body = await request.json();

        const updateFields: Record<string, unknown> = {};
        if (body.status) updateFields.status = body.status;
        if (body.trustScore !== undefined) updateFields.trustScore = body.trustScore;
        if (body.calibrationData) updateFields.calibrationData = body.calibrationData;
        if (body.answers) updateFields.answers = body.answers;
        if (body.endTime) updateFields.endTime = body.endTime;
        if (body.totalViolations !== undefined) updateFields.totalViolations = body.totalViolations;

        const session = await Session.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).lean();

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        return NextResponse.json({ session }, { status: 200 });
    } catch (error) {
        console.error("Update session error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
