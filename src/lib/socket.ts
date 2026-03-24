// ========================================
// ProctorAI — Socket.IO Client Singleton
// Auto-reconnection, typed events, room management
// ========================================

import { io, Socket } from "socket.io-client";
import type { SignalSnapshot, AdminAction } from "@/types";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002";

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ["websocket", "polling"],
        });

        socket.on("connect", () => {
            console.log("🔌 Socket.IO connected:", socket?.id);
        });

        socket.on("disconnect", (reason) => {
            console.log("🔌 Socket.IO disconnected:", reason);
        });

        socket.on("connect_error", (err) => {
            console.warn("🔌 Socket.IO connection error:", err.message);
        });
    }

    return socket;
}

export function connectSocket(): Socket {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
    }
    return s;
}

export function disconnectSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

// ── Student-side emitters ────────────────────────────

export function emitStudentJoin(data: {
    sessionId: string;
    examId: string;
    userId: string;
    userName: string;
}): void {
    const s = getSocket();
    s.emit("student:join", data);
}

export function emitSignalUpdate(data: {
    sessionId: string;
    snapshot: SignalSnapshot;
}): void {
    const s = getSocket();
    s.emit("signal:update", data);
}

export function emitViolation(data: {
    sessionId: string;
    type: string;
    severity: string;
    description: string;
    channels: string[];
}): void {
    const s = getSocket();
    s.emit("violation:create", data);
}

export function emitStudentLeave(sessionId: string): void {
    const s = getSocket();
    s.emit("student:leave", { sessionId });
}

// ── Admin-side listeners ─────────────────────────────

export function onStudentJoin(callback: (data: {
    sessionId: string;
    examId: string;
    userId: string;
    userName: string;
}) => void): void {
    const s = getSocket();
    s.on("student:join", callback);
}

export function onSignalUpdate(callback: (data: {
    sessionId: string;
    snapshot: SignalSnapshot;
}) => void): void {
    const s = getSocket();
    s.on("signal:update", callback);
}

export function onViolationCreated(callback: (data: {
    sessionId: string;
    type: string;
    severity: string;
    description: string;
}) => void): void {
    const s = getSocket();
    s.on("violation:create", callback);
}

export function onStudentLeave(callback: (data: {
    sessionId: string;
}) => void): void {
    const s = getSocket();
    s.on("student:leave", callback);
}

// ── Admin-side emitters ──────────────────────────────

export function emitAdminAction(data: {
    violationId: string;
    sessionId: string;
    action: AdminAction;
    note?: string;
}): void {
    const s = getSocket();
    s.emit("admin:action", data);
}

// ── Student-side listener for admin actions ──────────

export function onAdminAction(callback: (data: {
    violationId: string;
    action: AdminAction;
    note?: string;
}) => void): void {
    const s = getSocket();
    s.on("admin:action", callback);
}

// ── Connection state ─────────────────────────────────

export function isConnected(): boolean {
    return socket?.connected ?? false;
}
