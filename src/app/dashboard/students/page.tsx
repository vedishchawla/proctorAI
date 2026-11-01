"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    Search,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Clock,
    X,
    FileText,
    Printer,
    Activity,
    Shield,
    ChevronRight,
    Loader2
} from "lucide-react";

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

interface ViolationRecord {
    _id: string;
    type: string;
    severity: string;
    channels: string[];
    description: string;
    timestamp: string;
    adminAction: string;
}

interface ReportData {
    session: SessionItem;
    violations: ViolationRecord[];
    stats: {
        totalViolations: number;
        bySeverity: {
            info: number;
            low: number;
            medium: number;
            high: number;
            critical: number;
        };
        byType: Record<string, number>;
        byChannel: Record<string, number>;
        dismissed: number;
        confirmed: number;
        pending: number;
    };
}

export default function StudentsDashboardPage() {
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Report modal state
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [reportLoading, setReportLoading] = useState(false);

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

    // Fetch report when a student row is clicked
    const openStudentReport = async (sessionId: string) => {
        setSelectedSessionId(sessionId);
        setReportLoading(true);
        setReportData(null);
        try {
            const res = await fetch(`/api/reports/${sessionId}`);
            if (res.ok) {
                const data = await res.json();
                setReportData(data);
            }
        } catch (err) {
            console.error("Failed to fetch student report:", err);
        } finally {
            setReportLoading(false);
        }
    };

    const closeReport = () => {
        setSelectedSessionId(null);
        setReportData(null);
    };

    const filteredSessions = sessions.filter((s) => {
        const matchesSearch =
            (s.userName?.toLowerCase() || "").includes(search.toLowerCase()) ||
            (s.userEmail?.toLowerCase() || "").includes(search.toLowerCase()) ||
            s._id.includes(search);
        const matchesStatus = statusFilter === "all" || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const activeCount = sessions.filter((s) => s.status === "active" || s.status === "calibrating").length;
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
                        Student Sessions & Integrity Reports
                    </h1>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                        Click on any student row below to inspect their full AI session integrity report
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

            {/* Sessions Table with Clickable Rows */}
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
                                <th className="p-3.5 text-right">Action</th>
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
                                    <tr
                                        key={session._id}
                                        onClick={() => openStudentReport(session._id)}
                                        className="hover:bg-hacker-green/[0.03] cursor-pointer transition-colors group"
                                    >
                                        <td className="p-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-hacker-green/10 border border-hacker-green/20 flex items-center justify-center font-bold text-hacker-green text-xs group-hover:border-hacker-green transition-colors">
                                                    {session.userName?.charAt(0) || "S"}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium group-hover:text-hacker-green transition-colors flex items-center gap-1.5">
                                                        {session.userName || "Unnamed Candidate"}
                                                    </p>
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
                                        <td className="p-3.5 text-right font-mono text-[10px]">
                                            <span className="inline-flex items-center gap-1 text-gray-500 group-hover:text-hacker-green transition-colors">
                                                View Report
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* STUDENT INTEGRITY REPORT MODAL                          */}
            {/* ═══════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {selectedSessionId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-surface-1 border border-subtle w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden"
                        >
                            {/* Modal Top Bar */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-surface-2/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-hacker-green/10 border border-hacker-green/20 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-hacker-green" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-display font-bold text-white flex items-center gap-2">
                                            Student Integrity Report
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-3 text-gray-400">
                                                ID: {selectedSessionId.slice(-8)}
                                            </span>
                                        </h2>
                                        <p className="text-[11px] font-mono text-gray-500">
                                            Comprehensive 5-channel AI behavior analysis & incident log
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => window.print()}
                                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-3 transition-colors text-xs font-mono flex items-center gap-1.5"
                                        title="Print / Save PDF"
                                    >
                                        <Printer className="w-4 h-4" />
                                        <span className="hidden sm:inline">Print Report</span>
                                    </button>
                                    <button
                                        onClick={closeReport}
                                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-3 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {reportLoading ? (
                                    <div className="py-20 text-center font-mono text-xs text-gray-500">
                                        <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin text-hacker-green" />
                                        Aggregating multi-channel signals and incident records...
                                    </div>
                                ) : !reportData ? (
                                    <div className="py-20 text-center font-mono text-xs text-gray-500">
                                        Report data could not be retrieved.
                                    </div>
                                ) : (
                                    <>
                                        {/* Examinee & Session Overview Banner */}
                                        <div className="glass-card p-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                            <div className="md:col-span-2 space-y-1">
                                                <p className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">Candidate Details</p>
                                                <h3 className="text-lg font-display font-bold text-white">
                                                    {reportData.session.userName || "Unnamed Candidate"}
                                                </h3>
                                                <p className="text-xs font-mono text-gray-400">{reportData.session.userEmail || "No email"}</p>
                                                <div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-[11px] text-gray-500">
                                                    <span>Started: {new Date(reportData.session.startTime).toLocaleString()}</span>
                                                    <span>Status: <strong className="text-white uppercase">{reportData.session.status}</strong></span>
                                                </div>
                                            </div>

                                            {/* Trust Gauge */}
                                            <div className="flex flex-col items-center justify-center p-4 bg-surface-2/60 rounded-xl border border-subtle">
                                                <span className="font-mono text-[10px] text-gray-500 uppercase mb-1">Final Trust Score</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className={`text-4xl font-mono font-bold ${
                                                        reportData.session.trustScore >= 80
                                                            ? "text-hacker-green"
                                                            : reportData.session.trustScore >= 50
                                                            ? "text-[#ffb800]"
                                                            : "text-[#ff3366]"
                                                    }`}>
                                                        {reportData.session.trustScore}
                                                    </span>
                                                    <span className="text-xs font-mono text-gray-600">/ 100</span>
                                                </div>
                                                <span className="text-[10px] font-mono mt-1 text-gray-400">
                                                    {reportData.session.trustScore >= 80 ? "High Integrity" : reportData.session.trustScore >= 50 ? "Suspicious Activity" : "Integrity Compromised"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Metrics Breakdown Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                                            <div className="glass-card p-3.5 space-y-1">
                                                <span className="text-[10px] text-gray-500 uppercase">Critical Severity</span>
                                                <p className="text-xl font-bold text-[#ff3366]">{reportData.stats.bySeverity.critical}</p>
                                                <p className="text-[9px] text-gray-600">Face missing or multiple faces</p>
                                            </div>
                                            <div className="glass-card p-3.5 space-y-1">
                                                <span className="text-[10px] text-gray-500 uppercase">High Severity</span>
                                                <p className="text-xl font-bold text-[#ffb800]">{reportData.stats.bySeverity.high}</p>
                                                <p className="text-[9px] text-gray-600">Sustained tab/gaze deviation</p>
                                            </div>
                                            <div className="glass-card p-3.5 space-y-1">
                                                <span className="text-[10px] text-gray-500 uppercase">Medium / Low</span>
                                                <p className="text-xl font-bold text-gray-300">
                                                    {reportData.stats.bySeverity.medium + reportData.stats.bySeverity.low}
                                                </p>
                                                <p className="text-[9px] text-gray-600">Minor speech/head turn blips</p>
                                            </div>
                                            <div className="glass-card p-3.5 space-y-1">
                                                <span className="text-[10px] text-gray-500 uppercase">Total Incidents</span>
                                                <p className="text-xl font-bold text-white">{reportData.stats.totalViolations}</p>
                                                <p className="text-[9px] text-gray-600">Multi-channel correlations</p>
                                            </div>
                                        </div>

                                        {/* Behavioral Channels Breakdown */}
                                        <div className="glass-card p-4 space-y-3 font-mono text-xs">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <Activity className="w-3.5 h-3.5 text-hacker-green" />
                                                Behavioral Channel Triggers Count
                                            </p>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                                                {["face", "gaze", "headPose", "audio", "interaction"].map((ch) => (
                                                    <div key={ch} className="p-2.5 rounded bg-surface-2 border border-subtle flex flex-col justify-between">
                                                        <span className="text-gray-400 uppercase text-[10px]">{ch}</span>
                                                        <span className="text-base font-bold text-white mt-1">
                                                            {reportData.stats.byChannel[ch] || 0}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Violations Timeline Log */}
                                        <div className="glass-card p-4 space-y-3 font-mono text-xs">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-[#ffb800]" />
                                                    Flagged Incident Log ({reportData.violations.length})
                                                </p>
                                                <span className="text-[10px] text-gray-600">Chronological order</span>
                                            </div>

                                            {reportData.violations.length === 0 ? (
                                                <div className="p-6 text-center text-gray-500 border border-subtle rounded-lg bg-surface-2/20">
                                                    <CheckCircle className="w-6 h-6 text-hacker-green mx-auto mb-2" />
                                                    No violations were recorded for this session. Candidate maintained 100% integrity.
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                                    {reportData.violations.map((v, i) => (
                                                        <div
                                                            key={v._id || i}
                                                            className="p-3 rounded-lg bg-surface-2 border border-subtle flex items-start justify-between gap-3"
                                                        >
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                                            v.severity === "critical"
                                                                                ? "bg-[#ff3366]/10 text-[#ff3366] border border-[#ff3366]/30"
                                                                                : v.severity === "high"
                                                                                ? "bg-[#ffb800]/10 text-[#ffb800] border border-[#ffb800]/30"
                                                                                : "bg-gray-800 text-gray-300 border border-gray-700"
                                                                        }`}
                                                                    >
                                                                        {v.severity}
                                                                    </span>
                                                                    <span className="font-bold text-white text-xs uppercase">
                                                                        {v.type.replace(/_/g, " ")}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] text-gray-400 font-sans">{v.description}</p>
                                                            </div>
                                                            <div className="text-right text-[10px] text-gray-500 flex-shrink-0">
                                                                {new Date(v.timestamp).toLocaleTimeString()}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
