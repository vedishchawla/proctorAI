"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, Activity } from "lucide-react";

// ── Types ────────────────────────────────────────────
interface TrustDataPoint {
    time: string;
    timestamp: number;
    trustScore: number;
    face?: number;
    gaze?: number;
    headPose?: number;
    audio?: number;
    interaction?: number;
}

interface TrustScoreChartProps {
    trustHistory: TrustDataPoint[];
    studentName?: string;
    showChannels?: boolean;
    height?: number;
}

// ── Custom Tooltip ───────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
    if (!active || !payload || payload.length === 0) return null;

    const trust = payload.find((p) => p.dataKey === "trustScore");

    return (
        <div className="bg-[#0a0a0f]/95 border border-white/10 rounded-lg px-3 py-2 backdrop-blur-xl shadow-2xl">
            <p className="font-mono text-[10px] text-gray-500 mb-1">{label}</p>
            {trust && (
                <p className={`font-mono text-sm font-bold ${
                    trust.value >= 80 ? "text-[#00ff88]" :
                    trust.value >= 50 ? "text-[#ffb800]" :
                    "text-[#ff3366]"
                }`}>
                    Trust: {trust.value}
                </p>
            )}
            {payload.filter((p) => p.dataKey !== "trustScore").map((p) => (
                <p key={p.dataKey} className="font-mono text-[9px] text-gray-400">
                    {p.dataKey}: {typeof p.value === "number" ? (p.value * 100).toFixed(0) : p.value}%
                </p>
            ))}
        </div>
    );
}

// ── Gradient Defs for the chart ──────────────────────
function ChartGradients() {
    return (
        <defs>
            <linearGradient id="trustGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#00ff88" stopOpacity={0.05} />
                <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dangerGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff3366" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ff3366" stopOpacity={0} />
            </linearGradient>
        </defs>
    );
}

// ═══════════════════════════════════════════════════════
// TRUST SCORE CHART — Real-time line chart
// ═══════════════════════════════════════════════════════
export default function TrustScoreChart({
    trustHistory,
    studentName,
    showChannels = false,
    height = 200,
}: TrustScoreChartProps) {
    // Compute trend
    const trend = useMemo(() => {
        if (trustHistory.length < 2) return 0;
        const recent = trustHistory.slice(-10);
        const first = recent[0]?.trustScore || 0;
        const last = recent[recent.length - 1]?.trustScore || 0;
        return last - first;
    }, [trustHistory]);

    const currentScore = trustHistory[trustHistory.length - 1]?.trustScore ?? 100;

    const scoreColor = currentScore >= 80 ? "text-[#00ff88]" :
                       currentScore >= 50 ? "text-[#ffb800]" :
                       "text-[#ff3366]";

    const lineColor = currentScore >= 80 ? "#00ff88" :
                      currentScore >= 50 ? "#ffb800" :
                      "#ff3366";

    return (
        <motion.div
            className="glass-card p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-[#00ff88]" />
                    <span className="font-mono text-xs text-gray-400">
                        {studentName ? `Trust Score — ${studentName}` : "Live Trust Score"}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {/* Trend indicator */}
                    <div className="flex items-center gap-1">
                        <TrendingUp className={`w-3 h-3 ${trend >= 0 ? "text-[#00ff88]" : "text-[#ff3366] rotate-180"}`} />
                        <span className={`font-mono text-[10px] ${trend >= 0 ? "text-[#00ff88]" : "text-[#ff3366]"}`}>
                            {trend >= 0 ? "+" : ""}{trend.toFixed(1)}
                        </span>
                    </div>
                    {/* Current score */}
                    <motion.span
                        className={`font-mono text-lg font-bold ${scoreColor}`}
                        key={currentScore}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        {currentScore}
                    </motion.span>
                </div>
            </div>

            {/* Chart */}
            {trustHistory.length === 0 ? (
                <div className="flex items-center justify-center" style={{ height }}>
                    <span className="font-mono text-[10px] text-gray-700">Waiting for pipeline data...</span>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={height}>
                    <AreaChart data={trustHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <ChartGradients />
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis
                            dataKey="time"
                            tick={{ fontSize: 9, fill: "#555", fontFamily: "monospace" }}
                            tickLine={false}
                            axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 9, fill: "#555", fontFamily: "monospace" }}
                            tickLine={false}
                            axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                            ticks={[0, 25, 50, 75, 100]}
                        />
                        <Tooltip content={<CustomTooltip />} />

                        {/* Danger zone reference */}
                        <ReferenceLine y={50} stroke="#ff3366" strokeDasharray="4 4" strokeOpacity={0.3} />
                        <ReferenceLine y={80} stroke="#ffb800" strokeDasharray="4 4" strokeOpacity={0.2} />

                        {/* Trust score area + line */}
                        <Area
                            type="monotone"
                            dataKey="trustScore"
                            stroke={lineColor}
                            strokeWidth={2}
                            fill="url(#trustGradient)"
                            dot={false}
                            activeDot={{ r: 3, fill: lineColor, stroke: "#0a0a0f", strokeWidth: 2 }}
                            animationDuration={300}
                        />

                        {/* Channel lines (optional) */}
                        {showChannels && (
                            <>
                                <Line type="monotone" dataKey="face" stroke="#6366f1" strokeWidth={1} dot={false} strokeOpacity={0.5} />
                                <Line type="monotone" dataKey="gaze" stroke="#06b6d4" strokeWidth={1} dot={false} strokeOpacity={0.5} />
                                <Line type="monotone" dataKey="headPose" stroke="#f59e0b" strokeWidth={1} dot={false} strokeOpacity={0.5} />
                                <Line type="monotone" dataKey="audio" stroke="#ef4444" strokeWidth={1} dot={false} strokeOpacity={0.5} />
                                <Line type="monotone" dataKey="interaction" stroke="#8b5cf6" strokeWidth={1} dot={false} strokeOpacity={0.5} />
                            </>
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            )}

            {/* Channel legend (when showing channels) */}
            {showChannels && trustHistory.length > 0 && (
                <div className="flex items-center justify-center gap-4 mt-2">
                    {[
                        { key: "face", color: "#6366f1" },
                        { key: "gaze", color: "#06b6d4" },
                        { key: "headPose", color: "#f59e0b" },
                        { key: "audio", color: "#ef4444" },
                        { key: "interaction", color: "#8b5cf6" },
                    ].map((ch) => (
                        <div key={ch.key} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.color, opacity: 0.7 }} />
                            <span className="font-mono text-[8px] text-gray-600">{ch.key}</span>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
