import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Violation from "@/models/Violation";

// PATCH /api/violations/[id] — Admin action on violation
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;
        const body = await request.json();
        const { adminAction, adminNote } = body;

        if (!adminAction) {
            return NextResponse.json(
                { error: "adminAction is required" },
                { status: 400 }
            );
        }

        const violation = await Violation.findByIdAndUpdate(
            id,
            {
                adminAction,
                adminNote: adminNote || "",
            },
            { new: true, runValidators: true }
        ).lean();

        if (!violation) {
            return NextResponse.json({ error: "Violation not found" }, { status: 404 });
        }

        return NextResponse.json({ violation }, { status: 200 });
    } catch (error) {
        console.error("Update violation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
