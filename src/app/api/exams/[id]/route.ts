import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";

// GET /api/exams/[id] — Get single exam
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;
        const exam = await Exam.findById(id).lean();

        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        return NextResponse.json({ exam }, { status: 200 });
    } catch (error) {
        console.error("Get exam error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/exams/[id] — Update exam
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;
        const body = await request.json();

        const exam = await Exam.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        }).lean();

        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        return NextResponse.json({ exam }, { status: 200 });
    } catch (error) {
        console.error("Update exam error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/exams/[id] — Delete exam (soft delete)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        const exam = await Exam.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        ).lean();

        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Exam deleted" }, { status: 200 });
    } catch (error) {
        console.error("Delete exam error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
