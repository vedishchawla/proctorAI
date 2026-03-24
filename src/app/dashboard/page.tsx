"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, FileText, AlertTriangle, TrendingUp, Eye, Clock, Shield, ChevronRight } from "lucide-react";

// Stat card component
function StatCard({ label, value, icon: Icon, trend, color = "text-hacker-green" }: {
    label: string; value: string; icon: React.ElementType; trend?: string; color?: string;
}) {
    return (
        <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] text-gray-600 uppercase tracking-wider">{label}</span>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
            {trend && <p className="text-[10px] text-gray-600 mt-1 font-mono">{trend}</p>}
        </div>
    );
}

// Chart bar
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

export default function DashboardPage() {
    // Demo live students
    const [students] = useState([
        { name: "Arjun Patel", trust: 94, status: "active", exam: "DSA Fundamentals" },
        { name: "Priya Sharma", trust: 87, status: "active", exam: "Web Dev Basics" },
        { name: "Rahul Verma", trust: 72, status: "warning", exam: "System Design" },
        { name: "Sneha Gupta", trust: 45, status: "flagged", exam: "DSA Fundamentals" },
        { name: "Vikash Kumar", trust: 91, status: "active", exam: "Web Dev Basics" },
        { name: "Ananya Iyer", trust: 88, status: "active", exam: "System Design" },
    ]);

    const [incidents] = useState([
        { student: "Sneha Gupta", type: "multiple_faces", severity: "high", time: "2 min ago", channels: "face, gaze" },
        { student: "Rahul Verma", type: "tab_switch", severity: "medium", time: "5 min ago", channels: "interaction" },
        { student: "Sneha Gupta", type: "gaze_away", severity: "medium", time: "8 min ago", channels: "gaze, head" },
        { student: "Priya Sharma", type: "audio_speech", severity: "low", time: "12 min ago", channels: "audio" },
    ]);

    // Bars for trust distribution
    const trustBars = [
        { label: "0-20", height: 8, active: false },
        { label: "20-40", height: 15, active: false },
        { label: "40-60", height: 25, active: false },
        { label: "60-80", height: 55, active: true },
        { label: "80-100", height: 75, active: true },
    ];

    return (
        <div className="space-y-6">
            {/* Terminal header */}
            <div className="font-mono text-[10px] text-gray-600 space-y-1">
                <p><span className="text-hacker-green/50">$</span> dashboard --mode realtime</p>
                <p><span className="text-hacker-green">✓</span> monitoring {students.length} active sessions</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Active Sessions" value={`${students.length}`} icon={Users} trend="+2 last hour" />
                <StatCard label="Avg Trust Score" value="79" icon={TrendingUp} trend="↑ 3.2% from yesterday" />
                <StatCard label="Active Violations" value={`${incidents.length}`} icon={AlertTriangle} color="text-[#ffb800]" />
                <StatCard label="Exams Today" value="3" icon={FileText} trend="2 active, 1 completed" />
            </div>

            {/* Two column: Students + Incidents */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Live Students */}
                <div className="lg:col-span-2 glass-card p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="status-dot live" />
                            <span className="font-mono text-xs text-gray-400">Live Students</span>
                        </div>
                        <span className="font-mono text-[10px] text-gray-600">{students.length} online</span>
                    </div>

                    <div className="space-y-1.5">
                        {students.map((s, i) => {
                            const color = s.trust >= 70 ? "text-hacker-green" : s.trust >= 40 ? "text-[#ffb800]" : "text-[#ff3366]";
                            const dotColor = s.status === "active" ? "bg-hacker-green" : s.status === "warning" ? "bg-[#ffb800]" : "bg-[#ff3366]";
                            return (
                                <motion.div
                                    key={s.name}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.01] transition-colors cursor-pointer group"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} />
                                    <div className="w-6 h-6 rounded-md bg-surface-3 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                        {s.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-white truncate">{s.name}</p>
                                        <p className="text-[10px] text-gray-600 font-mono">{s.exam}</p>
                                    </div>
                                    <span className={`font-mono text-sm font-bold ${color}`}>{s.trust}</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Trust Distribution */}
                <div className="glass-card p-4">
                    <span className="font-mono text-xs text-gray-400">Trust Distribution</span>
                    <div className="flex items-end justify-around mt-6 h-24">
                        {trustBars.map((bar) => (
                            <Bar key={bar.label} height={bar.height} label={bar.label} active={bar.active} />
                        ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between font-mono text-[9px] text-gray-700">
                        <span>← suspicious</span>
                        <span>trusted →</span>
                    </div>
                </div>
            </div>

            {/* Incidents */}
            <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#ffb800]" />
                        <span className="font-mono text-xs text-gray-400">Recent Incidents</span>
                    </div>
                    <span className="font-mono text-[10px] text-gray-600">last 30 min</span>
                </div>

                <div className="space-y-1">
                    {incidents.map((inc, i) => {
                        const sevColor = inc.severity === "high" ? "text-[#ff3366]" : inc.severity === "medium" ? "text-[#ffb800]" : "text-gray-500";
                        const sevBg = inc.severity === "high" ? "bg-[#ff3366]/10 border-[#ff3366]/10" : inc.severity === "medium" ? "bg-[#ffb800]/10 border-[#ffb800]/10" : "bg-surface-2 border-subtle";
                        return (
                            <motion.div
                                key={i}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.01] transition-colors cursor-pointer"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${sevBg} ${sevColor}`}>
                                    {inc.severity}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white">{inc.student}</p>
                                    <p className="text-[10px] text-gray-600 font-mono">
                                        {inc.type.replace(/_/g, " ")} — {inc.channels}
                                    </p>
                                </div>
                                <span className="text-[10px] text-gray-600 font-mono flex-shrink-0">{inc.time}</span>

                                {/* Admin actions */}
                                <div className="flex gap-1 flex-shrink-0">
                                    <button className="px-2 py-1 rounded text-[9px] font-mono text-gray-500 border border-subtle hover:border-hacker-green/20 hover:text-hacker-green transition-all">
                                        dismiss
                                    </button>
                                    <button className="px-2 py-1 rounded text-[9px] font-mono text-gray-500 border border-subtle hover:border-[#ff3366]/20 hover:text-[#ff3366] transition-all">
                                        warn
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* System status footer */}
            <div className="flex items-center justify-between px-1 py-2 font-mono text-[9px] text-gray-700">
                <span>Socket.IO: <span className="text-hacker-green">connected</span></span>
                <span>TensorFlow.js: <span className="text-hacker-green">ready</span></span>
                <span>Pipeline: <span className="text-hacker-green">active</span></span>
                <span>Latency: <span className="text-gray-500">12ms</span></span>
            </div>
        </div>
    );
}
