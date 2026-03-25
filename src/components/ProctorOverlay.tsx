"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Volume2, Brain, AlertTriangle, Shield, Maximize2, Minimize2 } from "lucide-react";
import type { SignalSnapshot } from "@/types";

interface ProctorOverlayProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    snapshot: SignalSnapshot | null;
    trustScore: number;
    violations: Array<{ type: string; time: string; severity: string }>;
    pipelineReady: boolean;
    sessionId: string | null;
    socketConnected: boolean;
    compact?: boolean;
    onToggleCompact?: () => void;
}

// ── Face Bounding Box Canvas ─────────────────────────
function FaceCanvas({ videoRef, snapshot }: { videoRef: React.RefObject<HTMLVideoElement | null>; snapshot: SignalSnapshot | null }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = video.videoWidth || video.clientWidth;
        canvas.height = video.videoHeight || video.clientHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const detections = snapshot?.face.rawData?.detections as Array<{
            box: { x: number; y: number; width: number; height: number };
            score: number;
        }> | undefined;

        if (detections && detections.length > 0) {
            detections.forEach((det) => {
                const { x, y, width, height } = det.box;
                const faceCount = detections.length;

                // Green = 1 face (good), Red = 0 or 2+ faces (bad)
                const color = faceCount === 1 ? "#00ff88" : "#ff3366";
                const glowColor = faceCount === 1 ? "rgba(0,255,136,0.3)" : "rgba(255,51,102,0.3)";

                // Glow effect
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = 12;

                // Bounding box - corners only (like a viewfinder)
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                const cornerLen = Math.min(width, height) * 0.2;

                // Top-left
                ctx.beginPath();
                ctx.moveTo(x, y + cornerLen);
                ctx.lineTo(x, y);
                ctx.lineTo(x + cornerLen, y);
                ctx.stroke();

                // Top-right
                ctx.beginPath();
                ctx.moveTo(x + width - cornerLen, y);
                ctx.lineTo(x + width, y);
                ctx.lineTo(x + width, y + cornerLen);
                ctx.stroke();

                // Bottom-left
                ctx.beginPath();
                ctx.moveTo(x, y + height - cornerLen);
                ctx.lineTo(x, y + height);
                ctx.lineTo(x + cornerLen, y + height);
                ctx.stroke();

                // Bottom-right
                ctx.beginPath();
                ctx.moveTo(x + width - cornerLen, y + height);
                ctx.lineTo(x + width, y + height);
                ctx.lineTo(x + width, y + height - cornerLen);
                ctx.stroke();

                ctx.shadowBlur = 0;

                // Confidence label
                ctx.fillStyle = color;
                ctx.font = "bold 10px 'JetBrains Mono', monospace";
                ctx.fillText(`${(det.score * 100).toFixed(0)}%`, x + 4, y - 6);
            });
        } else if (snapshot && snapshot.face.score > 0.5) {
            // No face detected - show warning overlay
            ctx.fillStyle = "rgba(255, 51, 102, 0.1)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#ff3366";
            ctx.font = "bold 14px 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.fillText("⚠ NO FACE DETECTED", canvas.width / 2, canvas.height / 2);
            ctx.textAlign = "start";
        }

        // Draw gaze direction indicator
        if (snapshot?.gaze.rawData?.leftCenter && snapshot?.gaze.rawData?.rightCenter) {
            const leftCenter = snapshot.gaze.rawData.leftCenter as { x: number; y: number };
            const rightCenter = snapshot.gaze.rawData.rightCenter as { x: number; y: number };
            const leftIris = snapshot.gaze.rawData.leftIris as { x: number; y: number };
            const rightIris = snapshot.gaze.rawData.rightIris as { x: number; y: number };

            if (leftIris && rightIris) {
                // Draw small gaze dots on each eye
                [{ center: leftCenter, iris: leftIris }, { center: rightCenter, iris: rightIris }].forEach(({ iris }) => {
                    ctx.beginPath();
                    ctx.arc(iris.x, iris.y, 3, 0, Math.PI * 2);
                    ctx.fillStyle = snapshot.gaze.score < 0.4 ? "rgba(0,255,136,0.8)" : "rgba(255,184,0,0.8)";
                    ctx.fill();
                });
            }
        }
    }, [snapshot, videoRef]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ objectFit: "cover" }}
        />
    );
}

// ── Live Audio Waveform ──────────────────────────────
function AudioWaveform({ level, speechRatio }: { level: number; speechRatio: number }) {
    const bars = 12;
    return (
        <div className="flex items-end gap-[2px] h-8">
            {Array.from({ length: bars }).map((_, i) => {
                // Create a wave-like pattern using the audio level
                const wave = Math.sin((i / bars) * Math.PI * 2 + Date.now() * 0.005) * 0.3 + 0.5;
                const barHeight = Math.max(4, level * wave * 100);
                const isSpeech = speechRatio > 0.15 && level > 0.02;
                return (
                    <motion.div
                        key={i}
                        className="w-1 rounded-full"
                        animate={{ height: barHeight }}
                        transition={{ duration: 0.1 }}
                        style={{
                            backgroundColor: isSpeech
                                ? i < 8 ? "rgba(255,184,0,0.7)" : "rgba(255,51,102,0.7)"
                                : level > 0.01
                                    ? "rgba(0,255,136,0.5)"
                                    : "rgba(255,255,255,0.08)",
                        }}
                    />
                );
            })}
        </div>
    );
}

// ── Channel Status Strip ─────────────────────────────
function ChannelStrip({ snapshot }: { snapshot: SignalSnapshot | null }) {
    const channels = [
        { key: "face", label: "FACE", score: snapshot?.face.score ?? 0, icon: "👤" },
        { key: "gaze", label: "GAZE", score: snapshot?.gaze.score ?? 0, icon: "👁" },
        { key: "head", label: "HEAD", score: snapshot?.headPose.score ?? 0, icon: "🔄" },
        { key: "audio", label: "MIC", score: snapshot?.audio.score ?? 0, icon: "🎤" },
        { key: "input", label: "TAB", score: snapshot?.interaction.score ?? 0, icon: "⌨" },
    ];

    return (
        <div className="flex gap-1">
            {channels.map((ch) => {
                const color = ch.score < 0.3 ? "bg-hacker-green" : ch.score < 0.6 ? "bg-[#ffb800]" : "bg-[#ff3366]";
                const glow = ch.score < 0.3 ? "shadow-[0_0_6px_rgba(0,255,136,0.4)]" : ch.score >= 0.6 ? "shadow-[0_0_6px_rgba(255,51,102,0.4)]" : "";
                return (
                    <div key={ch.key} className="flex flex-col items-center gap-0.5" title={`${ch.label}: ${(ch.score * 100).toFixed(0)}%`}>
                        <motion.div
                            className={`w-2.5 h-2.5 rounded-full ${color} ${glow}`}
                            animate={{ scale: ch.score > 0.5 ? [1, 1.3, 1] : 1 }}
                            transition={{ duration: 0.5, repeat: ch.score > 0.5 ? Infinity : 0, repeatDelay: 0.5 }}
                        />
                        <span className="text-[7px] font-mono text-gray-600">{ch.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ── Trust Score Arc ───────────────────────────────────
function TrustArc({ score }: { score: number }) {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 70 ? "#00ff88" : score >= 40 ? "#ffb800" : "#ff3366";

    return (
        <div className="relative w-[68px] h-[68px]">
            <svg width={68} height={68} className="-rotate-90">
                <circle cx={34} cy={34} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                <motion.circle
                    cx={34} cy={34} r={radius} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    className="text-lg font-bold font-mono"
                    style={{ color }}
                    key={score}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    {score}
                </motion.span>
                <span className="text-[6px] text-gray-600 font-mono tracking-widest">TRUST</span>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// MAIN PROCTOR OVERLAY
// ═══════════════════════════════════════════════════════
export default function ProctorOverlay({
    videoRef,
    snapshot,
    trustScore,
    violations,
    pipelineReady,
    sessionId,
    socketConnected,
    compact = false,
    onToggleCompact,
}: ProctorOverlayProps) {
    const faceCount = (snapshot?.face.rawData?.faceCount as number) ?? -1;
    const audioLevel = (snapshot?.audio.rawData?.volume as number) ?? 0;
    const speechRatio = (snapshot?.audio.rawData?.speechRatio as number) ?? 0;
    const headYaw = (snapshot?.headPose.rawData?.yaw as number) ?? 0;
    const headPitch = (snapshot?.headPose.rawData?.pitch as number) ?? 0;
    const latestViolation = violations.length > 0 ? violations[violations.length - 1] : null;
    const isViolating = latestViolation && (Date.now() - new Date(`1970-01-01T${latestViolation.time}`).getTime()) < 3000;

    // ── Compact mode (for code editor view) ──
    if (compact) {
        return (
            <motion.div
                className="fixed bottom-4 right-4 z-50 glass-card p-2 space-y-2 w-[240px]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ borderColor: isViolating ? "rgba(255,51,102,0.3)" : undefined }}
            >
                {/* Compact webcam */}
                <div className="relative rounded-lg overflow-hidden aspect-[4/3]">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    <FaceCanvas videoRef={videoRef} snapshot={snapshot} />
                    <div className="absolute top-1 right-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-[8px] font-mono">
                        <div className="status-dot live" style={{ width: 4, height: 4 }} />
                        <span className="text-hacker-green">REC</span>
                    </div>
                    {/* Face count badge */}
                    <div className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${faceCount === 1 ? "bg-hacker-green/20 text-hacker-green" : "bg-[#ff3366]/20 text-[#ff3366]"
                        }`}>
                        {faceCount === -1 ? "..." : `${faceCount} face${faceCount !== 1 ? "s" : ""}`}
                    </div>
                </div>

                {/* Trust + Channels */}
                <div className="flex items-center justify-between">
                    <ChannelStrip snapshot={snapshot} />
                    <div className="flex items-center gap-1">
                        <span className={`text-sm font-bold font-mono ${trustScore >= 70 ? "text-hacker-green" : trustScore >= 40 ? "text-[#ffb800]" : "text-[#ff3366]"}`}>
                            {trustScore}
                        </span>
                        <span className="text-[7px] text-gray-600 font-mono">TRUST</span>
                    </div>
                </div>

                {/* Expand button */}
                <button
                    onClick={onToggleCompact}
                    className="w-full flex items-center justify-center gap-1 py-1 rounded text-[8px] font-mono text-gray-600 hover:text-hacker-green hover:bg-hacker-green/[0.03] transition-all"
                >
                    <Maximize2 className="w-2.5 h-2.5" /> expand
                </button>
            </motion.div>
        );
    }

    // ── Full mode (side panel) ──
    return (
        <div className="w-72 border-l border-subtle flex flex-col gap-3 p-3 overflow-y-auto bg-surface-0/50">
            {/* Webcam with face detection overlay */}
            <div className={`relative rounded-xl overflow-hidden border-2 transition-colors duration-300 ${isViolating ? "border-[#ff3366] shadow-[0_0_20px_rgba(255,51,102,0.2)]" : "border-subtle"}`}>
                <video ref={videoRef} autoPlay muted playsInline className="w-full aspect-[4/3] object-cover" />
                <FaceCanvas videoRef={videoRef} snapshot={snapshot} />

                {/* Scan line effect */}
                <div className="absolute inset-0 scan-line opacity-20" />

                {/* REC indicator */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 font-mono text-[9px]">
                    <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-[#ff3366]"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-hacker-green">REC</span>
                </div>

                {/* Face count badge */}
                <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-md font-mono text-[10px] font-bold ${faceCount === 1
                    ? "bg-hacker-green/20 text-hacker-green border border-hacker-green/20"
                    : faceCount === 0
                        ? "bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/20"
                        : faceCount > 1
                            ? "bg-[#ffb800]/20 text-[#ffb800] border border-[#ffb800]/20"
                            : "bg-black/60 text-gray-500"
                    }`}>
                    {faceCount === -1 ? "detecting..." : faceCount === 0 ? "⚠ 0 faces" : faceCount === 1 ? "✓ 1 face" : `⚠ ${faceCount} faces`}
                </div>

                {/* Pipeline status */}
                <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-[8px] font-mono">
                    <div className={`w-1.5 h-1.5 rounded-full ${pipelineReady ? "bg-hacker-green" : "bg-[#ffb800] animate-pulse"}`} />
                    <span className="text-gray-400">{pipelineReady ? "AI active" : "loading"}</span>
                </div>

                {/* Minimize button in full mode */}
                {onToggleCompact && (
                    <button
                        onClick={onToggleCompact}
                        className="absolute bottom-2 right-2 p-1 rounded bg-black/60 text-gray-500 hover:text-white transition-colors"
                    >
                        <Minimize2 className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Trust Score Arc */}
            <div className="flex items-center justify-center">
                <TrustArc score={trustScore} />
            </div>

            {/* Audio waveform */}
            <div className="glass-card p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                        <Volume2 className="w-3 h-3 text-gray-600" />
                        <span className="font-mono text-[9px] text-gray-600 uppercase tracking-wider">Audio Monitor</span>
                    </div>
                    <span className={`font-mono text-[9px] ${speechRatio > 0.15 && audioLevel > 0.02 ? "text-[#ffb800]" : "text-gray-700"}`}>
                        {speechRatio > 0.15 && audioLevel > 0.02 ? "SPEECH" : "quiet"}
                    </span>
                </div>
                <AudioWaveform level={audioLevel} speechRatio={speechRatio} />
            </div>

            {/* Channel Status */}
            <div className="glass-card p-2.5">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                        <Brain className="w-3 h-3 text-gray-600" />
                        <span className="font-mono text-[9px] text-gray-600 uppercase tracking-wider">Signal Channels</span>
                    </div>
                    <span className="font-mono text-[9px] text-gray-700">2fps</span>
                </div>

                {/* Detailed channel rows */}
                <div className="space-y-1">
                    {[
                        { key: "face", label: "FACE", score: snapshot?.face.score ?? 0, conf: snapshot?.face.confidence ?? 0 },
                        { key: "gaze", label: "GAZE", score: snapshot?.gaze.score ?? 0, conf: snapshot?.gaze.confidence ?? 0 },
                        { key: "head", label: "HEAD", score: snapshot?.headPose.score ?? 0, conf: snapshot?.headPose.confidence ?? 0 },
                        { key: "audio", label: "AUDIO", score: snapshot?.audio.score ?? 0, conf: snapshot?.audio.confidence ?? 0 },
                        { key: "input", label: "INPUT", score: snapshot?.interaction.score ?? 0, conf: snapshot?.interaction.confidence ?? 0 },
                    ].map((ch) => {
                        const barColor = ch.score < 0.3 ? "#00ff88" : ch.score < 0.6 ? "#ffb800" : "#ff3366";
                        const dotColor = ch.score < 0.3 ? "bg-hacker-green" : ch.score < 0.6 ? "bg-[#ffb800]" : "bg-[#ff3366]";
                        return (
                            <div key={ch.key} className="flex items-center gap-2 font-mono text-[10px]">
                                <motion.div
                                    className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
                                    animate={{ scale: ch.score > 0.5 ? [1, 1.4, 1] : 1, opacity: ch.score > 0.5 ? [1, 0.5, 1] : 1 }}
                                    transition={{ duration: 0.6, repeat: ch.score > 0.5 ? Infinity : 0 }}
                                />
                                <span className="text-gray-500 w-10">{ch.label}</span>
                                <motion.span
                                    className="w-8 text-right"
                                    style={{ color: barColor }}
                                    key={ch.score.toFixed(2)}
                                    initial={{ scale: 1.1 }}
                                    animate={{ scale: 1 }}
                                >
                                    {ch.score.toFixed(2)}
                                </motion.span>
                                <div className="flex-1 h-[3px] bg-surface-3 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full"
                                        animate={{ width: `${ch.conf * 100}%` }}
                                        transition={{ duration: 0.3 }}
                                        style={{ backgroundColor: barColor, opacity: 0.6 }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Head Pose Visualization */}
            {snapshot?.headPose.rawData && (
                <div className="glass-card p-2.5">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Eye className="w-3 h-3 text-gray-600" />
                        <span className="font-mono text-[9px] text-gray-600 uppercase tracking-wider">Head Pose</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                        {[
                            { label: "YAW", value: headYaw, max: 35 },
                            { label: "PITCH", value: headPitch, max: 30 },
                            { label: "ROLL", value: (snapshot.headPose.rawData.roll as number) ?? 0, max: 25 },
                        ].map((axis) => {
                            const absVal = Math.abs(axis.value);
                            const ratio = Math.min(1, absVal / axis.max);
                            const color = ratio < 0.5 ? "#00ff88" : ratio < 0.8 ? "#ffb800" : "#ff3366";
                            return (
                                <div key={axis.label} className="text-center">
                                    <span className="text-gray-600 text-[8px]">{axis.label}</span>
                                    <motion.p
                                        className="text-xs font-bold"
                                        style={{ color }}
                                        key={axis.value.toFixed(0)}
                                        initial={{ scale: 1.1 }}
                                        animate={{ scale: 1 }}
                                    >
                                        {axis.value.toFixed(1)}°
                                    </motion.p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Fusion Score */}
            {snapshot && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-1 border border-subtle font-mono text-[10px]">
                    <span className="text-gray-600">FUSION</span>
                    <motion.span
                        className={`font-bold ${snapshot.fusedScore < 0.3 ? "text-hacker-green" : snapshot.fusedScore < 0.6 ? "text-[#ffb800]" : "text-[#ff3366]"}`}
                        key={snapshot.fusedScore.toFixed(3)}
                        initial={{ scale: 1.15 }}
                        animate={{ scale: 1 }}
                    >
                        {snapshot.fusedScore.toFixed(3)}
                    </motion.span>
                </div>
            )}

            {/* DB + Socket status */}
            <div className="flex gap-2 font-mono text-[9px]">
                <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-1 border border-subtle">
                    <div className={`w-1.5 h-1.5 rounded-full ${sessionId ? "bg-hacker-green" : "bg-[#ffb800]"}`} />
                    <span className="text-gray-600">{sessionId ? "DB ✓" : "DB..."}</span>
                </div>
                <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-1 border border-subtle">
                    <div className={`w-1.5 h-1.5 rounded-full ${socketConnected ? "bg-hacker-green" : "bg-[#ff3366]"}`} />
                    <span className="text-gray-600">{socketConnected ? "WS ✓" : "WS ✗"}</span>
                </div>
            </div>

            {/* Violations log */}
            <AnimatePresence>
                {violations.length > 0 && (
                    <motion.div
                        className="glass-card p-2.5"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <AlertTriangle className="w-3 h-3 text-[#ff3366]" />
                            <span className="font-mono text-[9px] text-[#ff3366]">VIOLATIONS ({violations.length})</span>
                        </div>
                        {violations.slice(-4).map((v, i) => (
                            <div key={i} className="flex items-center gap-2 py-0.5 font-mono text-[9px]">
                                <motion.div
                                    className="w-1.5 h-1.5 rounded-full bg-[#ff3366]"
                                    initial={{ scale: 2 }}
                                    animate={{ scale: 1 }}
                                />
                                <span className="text-gray-500 truncate">{v.type.replace(/_/g, " ")}</span>
                                <span className="text-gray-700 ml-auto flex-shrink-0">{v.time}</span>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pipeline status footer */}
            <div className="flex items-center gap-1.5 px-2 py-1 font-mono text-[8px] text-gray-700">
                <Shield className="w-2.5 h-2.5" />
                <span>All AI runs client-side · Zero cloud uploads</span>
            </div>
        </div>
    );
}
