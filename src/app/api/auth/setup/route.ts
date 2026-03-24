import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
    try {
        await connectDB();

        const body = await request.json();
        const { firebaseUID, name, email, avatar, role } = body;

        if (!firebaseUID || !email) {
            return NextResponse.json(
                { error: "firebaseUID and email are required" },
                { status: 400 }
            );
        }

        // Find existing user or create new one
        let user = await User.findOne({ firebaseUID });

        if (user) {
            // Update existing user
            if (role) user.role = role;
            if (name) user.name = name;
            if (avatar) user.avatar = avatar;
            await user.save();
        } else {
            // Create new user
            user = await User.create({
                firebaseUID,
                name: name || "User",
                email,
                avatar: avatar || "",
                role: role || "student",
            });
        }

        return NextResponse.json({ user }, { status: 200 });
    } catch (error) {
        console.error("Auth setup error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
