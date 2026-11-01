"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, RefreshCw, AlertTriangle, CheckCircle, Clock, ShieldAlert, ExternalLink } from "lucide-react";

interface SessionItem {
    _id: string;
    examId: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    startTime: string;
    endTime?: string;
    trustScore: number;
    status: "calibrating" | "active" | "paused" | "completed" | "terminated";
    totalViolations: number;
}

export default function StudentsDashboardPage() {
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/sessions");
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
            }
        } catch (err) {
            console.error("Failed to fetch sessions:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const filteredSessions = sessions.filter((s) => {
        const matchesSearch =
            (s.userName?.toLowerCase() || "").includes(search.toLowerCase()) ||
            (s.userEmail?.toLowerCase() || "").includes(search.toLowerCase()) ||
            s._id.includes(search);
        const matchesStatus = statusFilter === "all" || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const activeCount = sessions.filter((s) => s.status === "active" || s.status === "calibrating").length;
    const completedCount = sessions.filter((s) => s.status === "completed").length;
    const avgTrust = sessions.length > 0
        ? Math.round(sessions.reduce((acc, curr) => acc + (curr.trustScore ?? 100), 0) / sessions.length)
        : 100;
    const totalViolations = sessions.reduce((acc, curr) => acc + (curr.totalViolations ?? 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-hacker-green" />
                        Student Sessions
                    </h1>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                        Track exam integrity, historical sessions, and live test-takers
                    </p>
                </div>
                <button
                    onClick={fetchSessions}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono text-gray-400 border border-subtle hover:border-glow hover:text-white transition-all self-start sm:self-auto"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-hacker-green" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4">
                    <p className="text-[10px] font-mono text-gray-500 uppercase">Total Sessions</p>
                    <p className="text-2xl font-mono font-bold text-white mt-1">{sessions.length}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] font-mono text-gray-500 uppercase">Live Test-Takers</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-hacker-green animate-pulse" />
                        <p className="text-2xl font-mono font-bold text-hacker-green">{activeCount}</p>
                    </div>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] font-mono text-gray-500 uppercase">Avg Trust Score</p>
                    <p className={`text-2xl font-mono font-bold mt-1 ${avgTrust >= 80 ? "text-hacker-green" : avgTrust >= 60 ? "text-[#ffb800]" : "text-[#ff3366]"}`}>
                        {avgTrust}%
                    </p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] font-mono text-gray-500 uppercase">Violations Flagged</p>
                    <p className="text-2xl font-mono font-bold text-[#ffb800] mt-1">{totalViolations}</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="glass-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search student name, email, session ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-surface-2 border border-subtle rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-hacker-green/50"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    {["all", "active", "completed", "calibrating"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setStatusFilter(tab)}
                            className={`px-3 py-1 rounded-md text-[11px] font-mono capitalize transition-all ${
                                statusFilter === tab
                                    ? "bg-hacker-green/10 text-hacker-green border border-hacker-green/30"
                                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sessions Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                        <thead>
                            <tr className="border-b border-subtle bg-surface-2/40 text-gray-500 text-[10px] uppercase">
                                <th className="p-3.5">Student</th>
                                <th className="p-3.5">Status</th>
                                <th className="p-3.5">Trust Score</th>
                                <th className="p-3.5">Violations</th>
                                <th className="p-3.5">Session Time</th>
                                <th className="p-3.5 text-right">Session ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-subtle/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-600">
                                        <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-hacker-green" />
                                        Loading student sessions...
                                    </td>
                                </tr>
                            ) : filteredSessions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-600">
                                        No student sessions found matching the filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredSessions.map((session) => (
                                    <tr key={session._id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-hacker-green/10 border border-hacker-green/20 flex items-center justify-center font-bold text-hacker-green text-xs">
                                                    {session.userName?.charAt(0) || "S"}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{session.userName || "Unnamed Candidate"}</p>
                                                    <p className="text-[10px] text-gray-500">{session.userEmail || "No email"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3.5">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                    session.status === "active"
                                                        ? "bg-hacker-green/10 text-hacker-green border border-hacker-green/30"
                                                        : session.status === "completed"
                                                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                                        : session.status === "calibrating"
                                                        ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                                        : "bg-gray-800 text-gray-400 border border-gray-700"
                                                }`}
                                            >
                                                {session.status === "active" && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-hacker-green animate-pulse" />
                                                )}
                                                {session.status}
                                            </span>
                                        </td>
                                        <td className="p-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-surface-3 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            session.trustScore >= 80
                                                                ? "bg-hacker-green"
                                                                : session.trustScore >= 50
                                                                ? "bg-[#ffb800]"
                                                                : "bg-[#ff3366]"
                                                        }`}
                                                        style={{ width: `${session.trustScore}%` }}
                                                    />
                                                </div>
                                                <span
                                                    className={`text-[11px] font-bold ${
                                                        session.trustScore >= 80
                                                            ? "text-hacker-green"
                                                            : session.trustScore >= 50
                                                            ? "text-[#ffb800]"
                                                            : "text-[#ff3366]"
                                                    }`}
                                                >
                                                    {session.trustScore}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-3.5">
                                            {session.totalViolations > 0 ? (
                                                <span className="flex items-center gap-1 text-[#ffb800]">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {session.totalViolations}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-gray-600">
                                                    <CheckCircle className="w-3 h-3 text-hacker-green/70" />
                                                    0
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-gray-400 text-[11px]">
                                            {session.startTime
                                                ? new Date(session.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
                                                  " (" + new Date(session.startTime).toLocaleDateString([], { month: "short", day: "numeric" }) + ")"
                                                : "—"}
                                        </td>
                                        <td className="p-3.5 text-right font-mono text-[10px] text-gray-600">
                                            <span className="bg-surface-2 px-1.5 py-0.5 rounded border border-subtle">
                                                {session._id.slice(-8)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

