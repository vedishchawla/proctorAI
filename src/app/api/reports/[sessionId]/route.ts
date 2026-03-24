import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Session from "@/models/Session";
import Violation from "@/models/Violation";

// GET /api/reports/[sessionId] — Detailed session report
export async function GET(
    request: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        await connectDB();
        const { sessionId } = await params;

        const session = await Session.findById(sessionId).lean();
        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const violations = await Violation.find({ sessionId })
            .sort({ timestamp: 1 })
            .lean();

        // Aggregate violation stats
        const stats = {
            totalViolations: violations.length,
            bySeverity: {
                info: violations.filter((v) => v.severity === "info").length,
                low: violations.filter((v) => v.severity === "low").length,
                medium: violations.filter((v) => v.severity === "medium").length,
                high: violations.filter((v) => v.severity === "high").length,
                critical: violations.filter((v) => v.severity === "critical").length,
            },
            byType: violations.reduce((acc, v) => {
                acc[v.type] = (acc[v.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            byChannel: violations.reduce((acc, v) => {
                v.channels.forEach((ch: string) => {
                    acc[ch] = (acc[ch] || 0) + 1;
                });
                return acc;
            }, {} as Record<string, number>),
            dismissed: violations.filter((v) => v.adminAction === "dismissed").length,
            confirmed: violations.filter((v) => v.adminAction === "confirmed").length,
            pending: violations.filter((v) => v.adminAction === "pending").length,
        };

        // Trust score timeline (mock — in production this would be from stored snapshots)
        const trustTimeline = violations.map((v, i) => ({
            timestamp: v.timestamp,
            trustScore: Math.max(0, 100 - (i + 1) * (100 / Math.max(violations.length, 1)) * 0.5),
            violation: v.type,
        }));

        return NextResponse.json(
            {
                session,
                violations,
                stats,
                trustTimeline,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Get report error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
