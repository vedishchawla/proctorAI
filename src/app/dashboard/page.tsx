"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Users, FileText, AlertTriangle, TrendingUp, ChevronRight, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { connectSocket, disconnectSocket, onStudentJoin, onSignalUpdate, onViolationCreated, onStudentLeave, emitAdminAction } from "@/lib/socket";
import type { AdminAction } from "@/types";

// ── Types ────────────────────────────────────────────
interface LiveStudent {
    sessionId: string;
    examId: string;
    userId: string;
    userName: string;
    trustScore: number;
    lastUpdate: number;
}

interface ViolationData {
    _id?: string;
    sessionId: string;
    type: string;
    severity: string;
    channels?: string[];
    description: string;
    adminAction?: string;
    timestamp?: number;
    createdAt?: string;
}

interface ExamData {
    _id: string;
    title: string;
    isActive: boolean;
}

// ── Stat Card ────────────────────────────────────────
function StatCard({ label, value, icon: Icon, trend, color = "text-hacker-green", loading }: {
    label: string; value: string; icon: React.ElementType; trend?: string; color?: string; loading?: boolean;
}) {
    return (
        <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] text-gray-600 uppercase tracking-wider">{label}</span>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            {loading ? (
                <div className="h-8 w-12 bg-surface-3 rounded animate-pulse" />
            ) : (
                <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
            )}
            {trend && <p className="text-[10px] text-gray-600 mt-1 font-mono">{trend}</p>}
        </div>
    );
}

// ── Trust Distribution Bar ───────────────────────────
function Bar({ height, label, active }: { height: number; label: string; active?: boolean }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <motion.div
                className={`w-5 rounded-sm ${active ? "bg-hacker-green" : "bg-hacker-green/20"}`}
                initial={{ height: 0 }}
                animate={{ height: `${height}px` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{ maxHeight: 80 }}
            />
            <span className="text-[8px] font-mono text-gray-700">{label}</span>
        </div>
    );
}

// ── Time Ago Helper ──────────────────────────────────
function timeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

// ═══════════════════════════════════════════════════════
// DASHBOARD — Socket.IO Real-Time + MongoDB Fallback
// ═══════════════════════════════════════════════════════
export default function DashboardPage() {
    // Live data — from Socket.IO
    const [liveStudents, setLiveStudents] = useState<Map<string, LiveStudent>>(new Map());
    const [liveViolations, setLiveViolations] = useState<ViolationData[]>([]);

    // DB data — initial load + fallback
    const [dbViolations, setDbViolations] = useState<ViolationData[]>([]);
    const [exams, setExams] = useState<ExamData[]>([]);
    const [loading, setLoading] = useState(true);

    // Socket state
    const [socketConnected, setSocketConnected] = useState(false);
    const socketInitRef = useRef(false);

    // ── FETCH INITIAL DATA FROM MONGODB ──
    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [violationsRes, examsRes] = await Promise.all([
                fetch("/api/violations").then((r) => r.json()).catch(() => ({ violations: [] })),
                fetch("/api/exams").then((r) => r.json()).catch(() => ({ exams: [] })),
            ]);
            setDbViolations(violationsRes.violations || []);
            setExams(examsRes.exams || []);
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── CONNECT SOCKET.IO ──
    useEffect(() => {
        fetchInitialData();

        try {
            const sock = connectSocket();

            const onConnect = () => {
                setSocketConnected(true);
                sock.emit("admin:join");
            };

            const onDisconnect = () => setSocketConnected(false);

            if (sock.connected) {
                onConnect();
            }

            sock.on("connect", onConnect);
            sock.on("disconnect", onDisconnect);

            // Initial live students dump
            sock.on("live:students", (data: { students: LiveStudent[] }) => {
                const map = new Map<string, LiveStudent>();
                data.students.forEach((s) => map.set(s.sessionId, s));
                setLiveStudents(map);
            });

            // Student joins
            onStudentJoin((data) => {
                setLiveStudents((prev) => {
                    const next = new Map(prev);
                    next.set(data.sessionId, { ...data, trustScore: 100, lastUpdate: Date.now() });
                    return next;
                });
            });

            // Signal update — live trust scores
            onSignalUpdate((data) => {
                const snap = data.snapshot as { trustScore?: number } | null;
                setLiveStudents((prev) => {
                    const next = new Map(prev);
                    const existing = next.get(data.sessionId);
                    if (existing) {
                        next.set(data.sessionId, {
                            ...existing,
                            trustScore: snap?.trustScore ?? existing.trustScore,
                            lastUpdate: Date.now(),
                        });
                    }
                    return next;
                });
            });

            // Violation
            onViolationCreated((data) => {
                setLiveViolations((prev) => [
                    { ...data, adminAction: "pending", timestamp: Date.now() },
                    ...prev,
                ].slice(0, 50));
            });

            // Student leaves
            onStudentLeave((data) => {
                setLiveStudents((prev) => {
                    const next = new Map(prev);
                    next.delete(data.sessionId);
                    return next;
                });
            });

            // Heartbeat
            sock.on("live:heartbeat", (data: { students: LiveStudent[] }) => {
                const map = new Map<string, LiveStudent>();
                data.students.forEach((s) => map.set(s.sessionId, s));
                setLiveStudents(map);
            });

            return () => {
                sock.off("connect", onConnect);
                sock.off("disconnect", onDisconnect);
            };
        } catch (err) {
            console.warn("Socket.IO unavailable — falling back to polling", err);
        }
    }, [fetchInitialData]);

    // ── Computed ──
    const studentsArray = Array.from(liveStudents.values());
    const avgTrust = studentsArray.length > 0
        ? Math.round(studentsArray.reduce((sum, s) => sum + s.trustScore, 0) / studentsArray.length)
        : 0;

    // Merge live violations with DB violations for display
    const allViolations = [...liveViolations, ...dbViolations].slice(0, 20);
    const pendingViolations = allViolations.filter((v) => v.adminAction === "pending");

    // Trust distribution from live students
    const trustBuckets = [0, 0, 0, 0, 0];
    studentsArray.forEach((s) => {
        const bucket = Math.min(4, Math.floor(s.trustScore / 20));
        trustBuckets[bucket]++;
    });
    const maxBucket = Math.max(1, ...trustBuckets);
    const trustBars = [
        { label: "0-20", height: (trustBuckets[0] / maxBucket) * 75, active: false },
        { label: "20-40", height: (trustBuckets[1] / maxBucket) * 75, active: false },
        { label: "40-60", height: (trustBuckets[2] / maxBucket) * 75, active: false },
        { label: "60-80", height: (trustBuckets[3] / maxBucket) * 75, active: true },
        { label: "80-100", height: (trustBuckets[4] / maxBucket) * 75, active: true },
    ];

    // ── Admin actions ──
    const handleDismiss = async (v: ViolationData) => {
        if (v._id) {
            await fetch(`/api/violations/${v._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminAction: "dismissed" }),
            });
        }
        emitAdminAction({
            violationId: v._id || "",
            sessionId: v.sessionId,
            action: "dismiss" as AdminAction,
        });
        // Update local state
        setLiveViolations((prev) => prev.map((lv) =>
            lv === v ? { ...lv, adminAction: "dismissed" } : lv
        ));
        setDbViolations((prev) => prev.map((dv) =>
            dv._id === v._id ? { ...dv, adminAction: "dismissed" } : dv
        ));
    };

    const handleWarn = async (v: ViolationData) => {
        if (v._id) {
            await fetch(`/api/violations/${v._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminAction: "warned" }),
            });
        }
        emitAdminAction({
            violationId: v._id || "",
            sessionId: v.sessionId,
            action: "warn" as AdminAction,
            note: "Admin issued a warning",
        });
        setLiveViolations((prev) => prev.map((lv) =>
            lv === v ? { ...lv, adminAction: "warned" } : lv
        ));
        setDbViolations((prev) => prev.map((dv) =>
            dv._id === v._id ? { ...dv, adminAction: "warned" } : dv
        ));
    };

    return (
        <div className="space-y-6">
            {/* Terminal header + Socket status */}
            <div className="flex items-center justify-between">
                <div className="font-mono text-[10px] text-gray-600 space-y-1">
                    <p><span className="text-hacker-green/50">$</span> dashboard --mode realtime --transport {socketConnected ? "websocket" : "polling"}</p>
                    <p>
                        <span className={socketConnected ? "text-hacker-green" : "text-[#ffb800]"}>
                            {socketConnected ? "✓" : "○"}
                        </span>{" "}
                        {socketConnected
                            ? `Socket.IO connected · ${studentsArray.length} live students · ${allViolations.length} violations`
                            : "Socket.IO disconnected — data from MongoDB"
                        }
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        {socketConnected ? <Wifi className="w-3.5 h-3.5 text-hacker-green" /> : <WifiOff className="w-3.5 h-3.5 text-[#ff3366]" />}
                        <span className="font-mono text-[9px] text-gray-600">{socketConnected ? "live" : "offline"}</span>
                    </div>
                    <button
                        onClick={fetchInitialData}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono text-gray-500 border border-subtle hover:border-glow hover:text-hacker-green transition-all"
                    >
                        <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                        refresh DB
                    </button>
                </div>
            </div>

            {/* Stats — computed from live + DB data */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Live Students" value={`${studentsArray.length}`} icon={Users} loading={loading}
                    trend={socketConnected ? "via Socket.IO" : "from MongoDB"} />
                <StatCard label="Avg Trust Score" value={`${avgTrust}`} icon={TrendingUp} loading={loading}
                    trend={studentsArray.length > 0 ? `across ${studentsArray.length} students` : "no active sessions"} />
                <StatCard label="Pending Violations" value={`${pendingViolations.length}`} icon={AlertTriangle} color="text-[#ffb800]" loading={loading}
                    trend={`${allViolations.length} total`} />
                <StatCard label="Active Exams" value={`${exams.filter((e) => e.isActive).length}`} icon={FileText} loading={loading}
                    trend={`${exams.length} total in DB`} />
            </div>

            {/* Two column: Live Students + Trust Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Live Student Grid — from Socket.IO */}
                <div className="lg:col-span-2 glass-card p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className={`status-dot ${socketConnected ? "live" : ""}`} />
                            <span className="font-mono text-xs text-gray-400">
                                {socketConnected ? "Live Students" : "Students (offline)"}
                            </span>
                        </div>
                        <span className="font-mono text-[10px] text-gray-600">{studentsArray.length} online</span>
                    </div>

                    {studentsArray.length === 0 ? (
                        <div className="py-8 text-center">
                            <p className="font-mono text-xs text-gray-600">No active exam sessions.</p>
                            <p className="font-mono text-[10px] text-gray-700 mt-1">
                                {socketConnected
                                    ? "Students will appear here in real-time when they start exams."
                                    : "Start the Socket.IO server: npx ts-node server.ts"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {studentsArray.map((s, i) => {
                                const color = s.trustScore >= 70 ? "text-hacker-green" : s.trustScore >= 40 ? "text-[#ffb800]" : "text-[#ff3366]";
                                const dotColor = s.trustScore >= 70 ? "bg-hacker-green" : s.trustScore >= 40 ? "bg-[#ffb800]" : "bg-[#ff3366]";
                                return (
                                    <motion.div
                                        key={s.sessionId}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.01] transition-colors cursor-pointer group"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                    >
                                        <motion.div
                                            className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`}
                                            animate={{ scale: [1, 1.3, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                        <div className="w-6 h-6 rounded-md bg-surface-3 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                            {s.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-white truncate">{s.userName}</p>
                                            <p className="text-[10px] text-gray-600 font-mono">
                                                session: {s.sessionId.slice(-6)} · {timeAgo(s.lastUpdate)}
                                            </p>
                                        </div>
                                        <motion.span
                                            className={`font-mono text-sm font-bold ${color}`}
                                            key={s.trustScore}
                                            initial={{ scale: 1.3 }}
                                            animate={{ scale: 1 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {s.trustScore}
                                        </motion.span>
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Trust Distribution */}
                <div className="glass-card p-4">
                    <span className="font-mono text-xs text-gray-400">Trust Distribution</span>
                    {studentsArray.length === 0 ? (
                        <div className="flex items-center justify-center h-24 mt-4">
                            <span className="font-mono text-[10px] text-gray-700">No live data</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-end justify-around mt-6 h-24">
                                {trustBars.map((bar) => (
                                    <Bar key={bar.label} height={bar.height} label={bar.label} active={bar.active} />
                                ))}
                            </div>
                            <div className="mt-4 flex items-center justify-between font-mono text-[9px] text-gray-700">
                                <span>← suspicious</span>
                                <span>trusted →</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Violations — from Socket.IO + MongoDB */}
            <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#ffb800]" />
                        <span className="font-mono text-xs text-gray-400">Violations</span>
                    </div>
                    <span className="font-mono text-[10px] text-gray-600">
                        {pendingViolations.length} pending review
                    </span>
                </div>

                {allViolations.length === 0 ? (
                    <div className="py-6 text-center">
                        <p className="font-mono text-xs text-gray-600">No violations.</p>
                        <p className="font-mono text-[10px] text-gray-700 mt-1">Violations stream in real-time via Socket.IO.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {allViolations.slice(0, 10).map((v, i) => {
                            const sevColor = v.severity === "critical" || v.severity === "high" ? "text-[#ff3366]" : v.severity === "medium" ? "text-[#ffb800]" : "text-gray-500";
                            const sevBg = v.severity === "critical" || v.severity === "high" ? "bg-[#ff3366]/10 border-[#ff3366]/10" : v.severity === "medium" ? "bg-[#ffb800]/10 border-[#ffb800]/10" : "bg-surface-2 border-subtle";
                            return (
                                <motion.div
                                    key={v._id || `live-${i}`}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.01] transition-colors"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                >
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${sevBg} ${sevColor}`}>
                                        {v.severity}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-white">{v.type.replace(/_/g, " ")}</p>
                                        <p className="text-[10px] text-gray-600 font-mono truncate">
                                            {v.description || `session: ${v.sessionId.slice(-8)}`}
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-gray-600 font-mono flex-shrink-0">
                                        {v.timestamp ? timeAgo(v.timestamp) : v.createdAt ? timeAgo(new Date(v.createdAt).getTime()) : "—"}
                                    </span>

                                    {v.adminAction === "pending" ? (
                                        <div className="flex gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => handleDismiss(v)}
                                                className="px-2 py-1 rounded text-[9px] font-mono text-gray-500 border border-subtle hover:border-hacker-green/20 hover:text-hacker-green transition-all"
                                            >
                                                dismiss
                                            </button>
                                            <button
                                                onClick={() => handleWarn(v)}
                                                className="px-2 py-1 rounded text-[9px] font-mono text-gray-500 border border-subtle hover:border-[#ff3366]/20 hover:text-[#ff3366] transition-all"
                                            >
                                                warn
                                            </button>
                                        </div>
                                    ) : (
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase ${
                                            v.adminAction === "dismissed" ? "text-gray-600 bg-surface-2" :
                                            v.adminAction === "warned" ? "text-[#ffb800] bg-[#ffb800]/10" :
                                            "text-gray-600"
                                        }`}>
                                            {v.adminAction}
                                        </span>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* System status footer */}
            <div className="flex items-center justify-between px-1 py-2 font-mono text-[9px] text-gray-700">
                <span>Socket.IO: <span className={socketConnected ? "text-hacker-green" : "text-[#ff3366]"}>{socketConnected ? "connected" : "disconnected"}</span></span>
                <span>MongoDB: <span className="text-hacker-green">connected</span></span>
                <span>Live: <span className="text-gray-500">{studentsArray.length}</span></span>
                <span>Violations: <span className="text-gray-500">{allViolations.length}</span></span>
                <span>Transport: <span className="text-gray-500">{socketConnected ? "ws" : "http"}</span></span>
            </div>
        </div>
    );
}
