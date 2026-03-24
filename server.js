// ========================================
// ProctorAI — Socket.IO Real-Time Server
// Handles student→admin streaming: trust scores, violations, admin actions
// ========================================

const http = require("http");
const { Server } = require("socket.io");

const nextPort = 3000;
const socketPort = 3002;

// ── Active sessions in memory ────────────────────────
const liveStudents = new Map();

// ── Socket.IO Server ─────────────────────────────────
const httpServer = http.createServer();
const io = new Server(httpServer, {
    cors: {
        origin: [`http://localhost:${nextPort}`, `http://localhost:3001`, "http://localhost:3002"],
        methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // ── Student joins exam ──
    socket.on("student:join", (data) => {
        console.log(`📥 Student joined: ${data.userName} (session: ${data.sessionId})`);

        liveStudents.set(data.sessionId, {
            ...data,
            socketId: socket.id,
            trustScore: 100,
            lastUpdate: Date.now(),
        });

        socket.join(`exam:${data.examId}`);
        socket.join(`session:${data.sessionId}`);

        io.to("admin").emit("student:join", {
            ...data,
            trustScore: 100,
            timestamp: Date.now(),
        });

        io.to("admin").emit("live:count", { count: liveStudents.size });
    });

    // ── Student sends signal update ──
    socket.on("signal:update", (data) => {
        const student = liveStudents.get(data.sessionId);
        if (student) {
            const snap = data.snapshot || {};
            student.trustScore = snap.trustScore ?? student.trustScore;
            student.lastUpdate = Date.now();
        }

        io.to("admin").emit("signal:update", {
            sessionId: data.sessionId,
            snapshot: data.snapshot,
            timestamp: Date.now(),
        });
    });

    // ── Student reports violation ──
    socket.on("violation:create", (data) => {
        console.log(`⚠️  Violation: ${data.type} (${data.severity}) — session: ${data.sessionId}`);

        io.to("admin").emit("violation:create", {
            ...data,
            timestamp: Date.now(),
        });
    });

    // ── Student leaves ──
    socket.on("student:leave", (data) => {
        const student = liveStudents.get(data.sessionId);
        if (student) {
            console.log(`📤 Student left: ${student.userName}`);
            liveStudents.delete(data.sessionId);

            io.to("admin").emit("student:leave", {
                sessionId: data.sessionId,
                userName: student.userName,
                timestamp: Date.now(),
            });
            io.to("admin").emit("live:count", { count: liveStudents.size });
        }
    });

    // ── Admin joins admin room ──
    socket.on("admin:join", () => {
        console.log(`👑 Admin connected: ${socket.id}`);
        socket.join("admin");

        const students = Array.from(liveStudents.values()).map((s) => ({
            sessionId: s.sessionId,
            examId: s.examId,
            userId: s.userId,
            userName: s.userName,
            trustScore: s.trustScore,
            lastUpdate: s.lastUpdate,
        }));
        socket.emit("live:students", { students, count: students.length });
    });

    // ── Admin sends action to student ──
    socket.on("admin:action", (data) => {
        console.log(`👑 Admin action: ${data.action} → session: ${data.sessionId}`);

        io.to(`session:${data.sessionId}`).emit("admin:action", {
            violationId: data.violationId,
            action: data.action,
            note: data.note,
        });
    });

    // ── Disconnect cleanup ──
    socket.on("disconnect", () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);

        for (const [sessionId, student] of liveStudents.entries()) {
            if (student.socketId === socket.id) {
                liveStudents.delete(sessionId);
                io.to("admin").emit("student:leave", {
                    sessionId,
                    userName: student.userName,
                    timestamp: Date.now(),
                });
                io.to("admin").emit("live:count", { count: liveStudents.size });
                break;
            }
        }
    });
});

// ── Periodic heartbeat (every 5s) ────────────────────
setInterval(() => {
    const students = Array.from(liveStudents.values()).map((s) => ({
        sessionId: s.sessionId,
        userName: s.userName,
        trustScore: s.trustScore,
        lastUpdate: s.lastUpdate,
    }));
    io.to("admin").emit("live:heartbeat", {
        students,
        count: students.length,
        timestamp: Date.now(),
    });
}, 5000);

// ── Start ────────────────────────────────────────────
httpServer.listen(socketPort, () => {
    console.log(`\n🚀 Socket.IO server running on http://localhost:${socketPort}`);
    console.log(`   Waiting for connections from Next.js app on port ${nextPort}...\n`);
});
