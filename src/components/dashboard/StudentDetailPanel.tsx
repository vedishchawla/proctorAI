"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, Ear, Mouse, MonitorSmartphone, ScanFace, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

// ── Types ────────────────────────────────────────────
interface ChannelScore {
    face: number;
    gaze: number;
    headPose: number;
    audio: number;
    interaction: number;
}

interface TrustHistoryPoint {
    timestamp: number;
    trustScore: number;
    channels?: ChannelScore;
}

interface StudentViolation {
    type: string;
    severity: string;
    timestamp: number;
    description?: string;
}

interface StudentDetailPanelProps {
    isOpen: boolean;
    onClose: () => void;
    studentName: string;
    sessionId: string;
    currentTrustScore: number;
    trustHistory: TrustHistoryPoint[];
    violations: StudentViolation[];
    pipelineMetrics?: {
        messagesPerSecond: number;
        avgLatencyMs: number;
        uptime: number;
    };
}

// ── Mini Sparkline ───────────────────────────────────
function Sparkline({ data, color, height = 24, width = 80 }: {
    data: number[];
    color: string;
    height?: number;
    width?: number;
}) {
    if (data.length < 2) return <div style={{ width, height }} className="bg-surface-2 rounded" />;

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.8}
            />
        </svg>
    );
}

// ── Channel Row ──────────────────────────────────────
function ChannelRow({ name, icon: Icon, score, history, color }: {
    name: string;
    icon: React.ElementType;
    score: number;
    history: number[];
    color: string;
}) {
    const percentage = Math.round(score * 100);
    const status = percentage <= 20 ? "normal" : percentage <= 50 ? "elevated" : "high";
    const statusColor = status === "normal" ? "text-[#00ff88]" : status === "elevated" ? "text-[#ffb800]" : "text-[#ff3366]";

    return (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
            <Icon className={`w-3.5 h-3.5 flex-shrink-0`} style={{ color }} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-gray-300">{name}</span>
                    <span className={`font-mono text-[10px] font-bold ${statusColor}`}>{percentage}%</span>
                </div>
                {/* Anomaly bar */}
                <div className="mt-1 h-1 bg-surface-3 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(percentage, 100)}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </div>
            </div>
            <Sparkline data={history} color={color} />
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// STUDENT DETAIL PANEL — Slide-out with channel breakdown
// ═══════════════════════════════════════════════════════
export default function StudentDetailPanel({
    isOpen,
    onClose,
    studentName,
    sessionId,
    currentTrustScore,
    trustHistory,
    violations,
    pipelineMetrics,
}: StudentDetailPanelProps) {
    // Extract channel histories
    const channelHistories = useMemo(() => {
        const face: number[] = [];
        const gaze: number[] = [];
        const headPose: number[] = [];
        const audio: number[] = [];
        const interaction: number[] = [];

        trustHistory.slice(-30).forEach((p) => {
            if (p.channels) {
                face.push(p.channels.face);
                gaze.push(p.channels.gaze);
                headPose.push(p.channels.headPose);
                audio.push(p.channels.audio);
                interaction.push(p.channels.interaction);
            }
        });

        return { face, gaze, headPose, audio, interaction };
    }, [trustHistory]);

    // Latest channel scores
    const latestChannels: ChannelScore = trustHistory[trustHistory.length - 1]?.channels || {
        face: 0, gaze: 0, headPose: 0, audio: 0, interaction: 0,
    };

    // Trust trend
    const trend = useMemo(() => {
        if (trustHistory.length < 5) return 0;
        const recent = trustHistory.slice(-10);
        return (recent[recent.length - 1]?.trustScore || 0) - (recent[0]?.trustScore || 0);
    }, [trustHistory]);

    const scoreColor = currentTrustScore >= 80 ? "text-[#00ff88]" :
                       currentTrustScore >= 50 ? "text-[#ffb800]" :
                       "text-[#ff3366]";

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        className="fixed right-0 top-0 bottom-0 w-[380px] bg-[#0a0a0f]/95 border-l border-white/5 backdrop-blur-xl z-50 overflow-y-auto"
                        initial={{ x: 380 }}
                        animate={{ x: 0 }}
                        exit={{ x: 380 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between z-10">
                            <div>
                                <h3 className="text-sm font-semibold text-white">{studentName}</h3>
                                <p className="font-mono text-[9px] text-gray-600">session: {sessionId.slice(-8)}</p>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Trust Score Hero */}
                            <div className="glass-card p-4 text-center">
                                <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">Trust Score</span>
                                <motion.p
                                    className={`text-4xl font-bold font-mono mt-1 ${scoreColor}`}
                                    key={currentTrustScore}
                                    initial={{ scale: 1.1 }}
                                    animate={{ scale: 1 }}
                                >
                                    {currentTrustScore}
                                </motion.p>
                                <div className="flex items-center justify-center gap-1 mt-2">
                                    {trend >= 0 ? (
                                        <TrendingUp className="w-3 h-3 text-[#00ff88]" />
                                    ) : (
                                        <TrendingDown className="w-3 h-3 text-[#ff3366]" />
                                    )}
                                    <span className={`font-mono text-[10px] ${trend >= 0 ? "text-[#00ff88]" : "text-[#ff3366]"}`}>
                                        {trend >= 0 ? "+" : ""}{trend.toFixed(1)} trend
                                    </span>
                                </div>
                            </div>

                            {/* Channel Breakdown */}
                            <div className="glass-card p-3">
                                <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider px-1">
                                    Channel Breakdown (anomaly %)
                                </span>
                                <div className="mt-2 space-y-0.5">
                                    <ChannelRow name="Face Detection" icon={ScanFace} score={latestChannels.face} history={channelHistories.face} color="#6366f1" />
                                    <ChannelRow name="Gaze Tracking" icon={Eye} score={latestChannels.gaze} history={channelHistories.gaze} color="#06b6d4" />
                                    <ChannelRow name="Head Pose" icon={MonitorSmartphone} score={latestChannels.headPose} history={channelHistories.headPose} color="#f59e0b" />
                                    <ChannelRow name="Audio Analysis" icon={Ear} score={latestChannels.audio} history={channelHistories.audio} color="#ef4444" />
                                    <ChannelRow name="Interaction" icon={Mouse} score={latestChannels.interaction} history={channelHistories.interaction} color="#8b5cf6" />
                                </div>
                            </div>

                            {/* Violations */}
                            <div className="glass-card p-3">
                                <div className="flex items-center gap-2 px-1 mb-2">
                                    <AlertTriangle className="w-3 h-3 text-[#ffb800]" />
                                    <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">
                                        Violations ({violations.length})
                                    </span>
                                </div>
                                {violations.length === 0 ? (
                                    <p className="text-center font-mono text-[10px] text-gray-700 py-3">No violations</p>
                                ) : (
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {violations.slice(0, 10).map((v, i) => {
                                            const sevColor = v.severity === "critical" || v.severity === "high"
                                                ? "text-[#ff3366]"
                                                : v.severity === "medium" ? "text-[#ffb800]" : "text-gray-500";
                                            return (
                                                <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.01]">
                                                    <span className={`font-mono text-[8px] font-bold uppercase ${sevColor}`}>
                                                        {v.severity}
                                                    </span>
                                                    <span className="font-mono text-[10px] text-gray-400 flex-1 truncate">
                                                        {v.type.replace(/_/g, " ")}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Pipeline Metrics */}
                            {pipelineMetrics && (
                                <div className="glass-card p-3">
                                    <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider px-1">
                                        Pipeline Metrics
                                    </span>
                                    <div className="mt-2 grid grid-cols-3 gap-2">
                                        <div className="text-center">
                                            <p className="font-mono text-xs text-[#00ff88]">{pipelineMetrics.messagesPerSecond}</p>
                                            <p className="font-mono text-[8px] text-gray-600">msg/sec</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-mono text-xs text-[#06b6d4]">{pipelineMetrics.avgLatencyMs.toFixed(1)}ms</p>
                                            <p className="font-mono text-[8px] text-gray-600">latency</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-mono text-xs text-gray-400">{Math.floor(pipelineMetrics.uptime / 1000)}s</p>
                                            <p className="font-mono text-[8px] text-gray-600">uptime</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
