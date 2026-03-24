"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useParams, useRouter } from "next/navigation";
import type { SignalSnapshot, CalibrationData } from "@/types";
import { Shield, Camera, Mic, AlertTriangle, CheckCircle, Clock, ChevronRight, Volume2 } from "lucide-react";

// ── Trust Gauge ──────────────────────────────────────
function TrustGauge({ score }: { score: number }) {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 70 ? "#00ff88" : score >= 40 ? "#ffb800" : "#ff3366";
    return (
        <div className="relative w-[100px] h-[100px]">
            <svg width={100} height={100} className="-rotate-90">
                <circle cx={50} cy={50} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
                <motion.circle
                    cx={50} cy={50} r={radius} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold font-mono" style={{ color }}>{score}</span>
                <span className="text-[8px] text-gray-600 font-mono">TRUST</span>
            </div>
        </div>
    );
}

// ── Audio Meter ──────────────────────────────────────
function AudioMeter({ level }: { level: number }) {
    const bars = 8;
    return (
        <div className="flex items-end gap-[2px] h-6">
            {Array.from({ length: bars }).map((_, i) => {
                const threshold = (i + 1) / bars;
                const active = level >= threshold;
                return (
                    <motion.div
                        key={i}
                        className="w-1 rounded-full"
                        style={{
                            height: `${((i + 1) / bars) * 100}%`,
                            backgroundColor: active
                                ? i < 5 ? "rgba(0,255,136,0.6)" : i < 7 ? "rgba(255,184,0,0.6)" : "rgba(255,51,102,0.6)"
                                : "rgba(255,255,255,0.06)",
                        }}
                        animate={{ scaleY: active ? [0.8, 1, 0.9] : 1 }}
                        transition={{ duration: 0.3 }}
                    />
                );
            })}
        </div>
    );
}

// ── Channel Status Dots ──────────────────────────────
function ChannelDots({ snapshot }: { snapshot: SignalSnapshot | null }) {
    const channels = [
        { key: "face", label: "FACE", score: snapshot?.face.score || 0 },
        { key: "gaze", label: "GAZE", score: snapshot?.gaze.score || 0 },
        { key: "head", label: "HEAD", score: snapshot?.headPose.score || 0 },
        { key: "audio", label: "AUDIO", score: snapshot?.audio.score || 0 },
        { key: "input", label: "INPUT", score: snapshot?.interaction.score || 0 },
    ];
    return (
        <div className="space-y-1.5">
            {channels.map((ch) => {
                const color = ch.score < 0.3 ? "bg-hacker-green" : ch.score < 0.6 ? "bg-[#ffb800]" : "bg-[#ff3366]";
                const glow = ch.score < 0.3 ? "shadow-glow-green" : "";
                return (
                    <div key={ch.key} className="flex items-center gap-2 font-mono text-[10px]">
                        <div className={`w-1.5 h-1.5 rounded-full ${color} ${glow}`} />
                        <span className="text-gray-600 w-10">{ch.label}</span>
                        <span className="text-gray-500">{ch.score.toFixed(2)}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// MAIN EXAM PAGE
// ═══════════════════════════════════════════════════════
export default function ExamPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [phase, setPhase] = useState<"permissions" | "calibrating" | "active" | "completed">("permissions");
    const [calibrationProgress, setCalibrationProgress] = useState(0);
    const [trustScore, setTrustScore] = useState(100);
    const [snapshot, setSnapshot] = useState<SignalSnapshot | null>(null);
    const [audioLevel, setAudioLevel] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [timeLeft, setTimeLeft] = useState(3600); // 60min default
    const [violations, setViolations] = useState<Array<{ type: string; time: string }>>([]);
    const [warningVisible, setWarningVisible] = useState(false);
    const [warningText, setWarningText] = useState("");
    const streamRef = useRef<MediaStream | null>(null);

    // Demo questions
    const questions = [
        { id: "q1", text: "What is the time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n²)", "O(1)"], correctAnswer: 1, points: 5 },
        { id: "q2", text: "Which data structure uses LIFO principle?", options: ["Queue", "Stack", "Array", "Linked List"], correctAnswer: 1, points: 5 },
        { id: "q3", text: "What does REST stand for?", options: ["Representational State Transfer", "Real-time Execution State", "Remote System Task", "Resource Exchange Standard"], correctAnswer: 0, points: 5 },
        { id: "q4", text: "Which sorting algorithm has O(n log n) worst case?", options: ["Quick Sort", "Bubble Sort", "Merge Sort", "Selection Sort"], correctAnswer: 2, points: 5 },
        { id: "q5", text: "What is a closure in JavaScript?", options: ["A function with no return", "A function that retains access to its outer scope", "A method to close a connection", "A way to end a loop"], correctAnswer: 1, points: 5 },
    ];

    // Request permissions
    const requestPermissions = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setPhase("calibrating");

            // Simulate calibration
            let progress = 0;
            const calibInterval = setInterval(() => {
                progress += 100 / 30; // 30 seconds
                setCalibrationProgress(Math.min(100, progress));
                if (progress >= 100) {
                    clearInterval(calibInterval);
                    setPhase("active");
                }
            }, 1000);
        } catch {
            alert("Camera and microphone access are required for the proctored exam.");
        }
    }, []);

    // Timer
    useEffect(() => {
        if (phase !== "active") return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    setPhase("completed");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [phase]);

    // Simulate AI analysis
    useEffect(() => {
        if (phase !== "active") return;
        const interval = setInterval(() => {
            // Simulate trust score fluctuations
            setTrustScore((prev) => {
                const delta = (Math.random() - 0.48) * 3;
                return Math.max(0, Math.min(100, Math.round(prev + delta)));
            });
            setAudioLevel(Math.random() * 0.3);
        }, 2000);
        return () => clearInterval(interval);
    }, [phase]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };

    const submitExam = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
        }
        setPhase("completed");
    };

    // ── PERMISSIONS PHASE ──
    if (phase === "permissions") {
        return (
            <div className="min-h-screen bg-surface-0 flex items-center justify-center relative">
                <div className="fixed inset-0 dot-grid z-0" />
                <div className="relative z-10 max-w-md px-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-6 rounded-xl bg-hacker-green/10 border border-hacker-green/20 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-hacker-green" />
                    </div>
                    <h1 className="text-xl font-display font-bold text-white mb-2">Proctored Exam</h1>
                    <p className="text-xs text-gray-500 mb-6">We need access to your camera and microphone for AI-powered monitoring.</p>

                    <div className="glass-card p-5 space-y-3 mb-6 text-left">
                        {[
                            { icon: Camera, label: "Camera access for face detection and gaze tracking" },
                            { icon: Mic, label: "Microphone access for audio environment monitoring" },
                            { icon: Shield, label: "AI runs in your browser — no video uploaded" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <item.icon className="w-4 h-4 text-hacker-green flex-shrink-0" />
                                <span className="text-xs text-gray-400">{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <motion.button
                        onClick={requestPermissions}
                        className="gradient-btn px-8 py-3 rounded-lg"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        Grant Access & Start →
                    </motion.button>
                </div>
            </div>
        );
    }

    // ── CALIBRATING PHASE ──
    if (phase === "calibrating") {
        return (
            <div className="min-h-screen bg-surface-0 flex items-center justify-center relative">
                <div className="fixed inset-0 dot-grid z-0" />
                <div className="relative z-10 max-w-lg px-6 text-center">
                    <div className="relative w-48 h-48 mx-auto mb-8">
                        {/* Webcam preview */}
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover rounded-2xl border border-subtle" />
                        {/* Progress ring */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 192 192">
                            <circle cx={96} cy={96} r={90} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                            <motion.circle
                                cx={96} cy={96} r={90} fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 90}
                                animate={{ strokeDashoffset: 2 * Math.PI * 90 * (1 - calibrationProgress / 100) }}
                                transition={{ duration: 0.5 }}
                                style={{ filter: "drop-shadow(0 0 6px rgba(0,255,136,0.3))" }}
                            />
                        </svg>
                        {/* Scan line */}
                        <div className="absolute inset-0 rounded-2xl overflow-hidden scan-line" />
                    </div>

                    <h2 className="text-lg font-display font-bold text-white mb-2">Calibrating...</h2>
                    <p className="text-xs text-gray-500 mb-4">
                        Look straight at the screen. Stay still. Keep your environment quiet.
                    </p>
                    <p className="font-mono text-sm text-hacker-green glow-green">{Math.round(calibrationProgress)}%</p>
                </div>
            </div>
        );
    }

    // ── COMPLETED PHASE ──
    if (phase === "completed") {
        const answeredCount = Object.keys(answers).length;
        return (
            <div className="min-h-screen bg-surface-0 flex items-center justify-center relative">
                <div className="fixed inset-0 dot-grid z-0" />
                <div className="relative z-10 max-w-md px-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-6 rounded-xl bg-hacker-green/10 border border-hacker-green/20 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-hacker-green" />
                    </div>
                    <h1 className="text-xl font-display font-bold text-white mb-2">Exam Submitted</h1>
                    <p className="text-xs text-gray-500 mb-6">Your responses have been recorded.</p>

                    <div className="glass-card p-5 space-y-3 text-left font-mono text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">Questions answered</span><span className="text-white">{answeredCount}/{questions.length}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Final trust score</span><span className="text-hacker-green">{trustScore}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Violations flagged</span><span className="text-white">{violations.length}</span></div>
                    </div>

                    <motion.button
                        onClick={() => router.push("/exam")}
                        className="mt-6 px-6 py-2.5 rounded-lg text-xs font-mono text-gray-400 border border-subtle hover:border-glow hover:text-hacker-green transition-all"
                        whileHover={{ scale: 1.02 }}
                    >
                        ← back to exams
                    </motion.button>
                </div>
            </div>
        );
    }

    // ── ACTIVE EXAM PHASE ──
    return (
        <div className="min-h-screen bg-surface-0 flex flex-col">
            {/* Top bar */}
            <header className="sticky top-0 z-50 glass flex items-center justify-between px-4 py-2 border-b border-subtle">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-hacker-green/10 flex items-center justify-center">
                        <span className="text-hacker-green font-mono text-[10px] font-bold">P</span>
                    </div>
                    <span className="font-mono text-xs text-gray-500">
                        Q{currentQuestion + 1}/{questions.length}
                    </span>
                </div>

                {/* Timer */}
                <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${timeLeft < 300 ? "text-[#ff3366]" : "text-white"}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(timeLeft)}
                    {timeLeft < 300 && <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-[#ff3366]" />}
                </div>

                <motion.button
                    onClick={submitExam}
                    className="px-4 py-1.5 rounded-md text-xs font-mono font-bold text-black bg-hacker-green hover:shadow-glow-green transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    submit exam
                </motion.button>
            </header>

            {/* 3-panel layout */}
            <div className="flex-1 flex">
                {/* Left — Questions */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-xl">
                        <span className="section-label">question {currentQuestion + 1}</span>
                        <h2 className="text-lg font-display font-semibold text-white mt-2 mb-6">
                            {questions[currentQuestion].text}
                        </h2>

                        <div className="space-y-2">
                            {questions[currentQuestion].options.map((opt, i) => (
                                <motion.button
                                    key={i}
                                    onClick={() => setAnswers({ ...answers, [currentQuestion]: i })}
                                    className={`w-full text-left glass-card p-4 text-sm transition-all duration-300 ${
                                        answers[currentQuestion] === i
                                            ? "border-hacker-green/30 bg-hacker-green/[0.03] text-white"
                                            : "text-gray-400 hover:text-gray-200"
                                    }`}
                                    whileHover={{ x: 3 }}
                                >
                                    <span className="font-mono text-xs text-gray-600 mr-3">{String.fromCharCode(65 + i)}.</span>
                                    {opt}
                                </motion.button>
                            ))}
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between mt-8">
                            <button
                                onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
                                disabled={currentQuestion === 0}
                                className="px-4 py-2 rounded-lg text-xs font-mono text-gray-500 border border-subtle hover:border-glow disabled:opacity-30 transition-all"
                            >
                                ← prev
                            </button>
                            {/* Question dots */}
                            <div className="flex gap-1.5">
                                {questions.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentQuestion(i)}
                                        className={`w-2 h-2 rounded-full transition-all ${
                                            i === currentQuestion ? "bg-hacker-green shadow-glow-green" :
                                            answers[i] !== undefined ? "bg-hacker-green/30" : "bg-gray-700"
                                        }`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentQuestion((p) => Math.min(questions.length - 1, p + 1))}
                                disabled={currentQuestion === questions.length - 1}
                                className="px-4 py-2 rounded-lg text-xs font-mono text-gray-500 border border-subtle hover:border-glow disabled:opacity-30 transition-all flex items-center gap-1"
                            >
                                next <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right — Monitor Panel */}
                <div className="w-72 border-l border-subtle p-4 flex flex-col gap-4">
                    {/* Webcam */}
                    <div className="relative rounded-xl overflow-hidden border border-subtle">
                        <video ref={videoRef} autoPlay muted playsInline className="w-full aspect-[4/3] object-cover" />
                        <div className="absolute inset-0 scan-line opacity-30" />
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 font-mono text-[9px]">
                            <div className="status-dot live" />
                            <span className="text-hacker-green">LIVE</span>
                        </div>
                    </div>

                    {/* Trust Gauge */}
                    <div className="flex items-center justify-center">
                        <TrustGauge score={trustScore} />
                    </div>

                    {/* Audio meter */}
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2 font-mono text-[10px] text-gray-600">
                            <Volume2 className="w-3 h-3" />
                            <span>AUDIO</span>
                        </div>
                        <AudioMeter level={audioLevel} />
                    </div>

                    {/* Channel dots */}
                    <div className="glass-card p-3">
                        <p className="font-mono text-[9px] text-gray-600 mb-2 uppercase tracking-wider">Channels</p>
                        <ChannelDots snapshot={snapshot} />
                    </div>

                    {/* Violations */}
                    {violations.length > 0 && (
                        <div className="glass-card p-3">
                            <p className="font-mono text-[9px] text-[#ff3366] mb-2">VIOLATIONS ({violations.length})</p>
                            {violations.slice(-3).map((v, i) => (
                                <div key={i} className="flex items-center gap-2 py-1">
                                    <AlertTriangle className="w-2.5 h-2.5 text-[#ff3366]" />
                                    <span className="text-[10px] text-gray-500 font-mono">{v.type.replace(/_/g, " ")}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Warning overlay */}
            <AnimatePresence>
                {warningVisible && (
                    <motion.div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#ff3366]/10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="glass-card px-8 py-6 text-center border-[#ff3366]/20">
                            <AlertTriangle className="w-8 h-8 text-[#ff3366] mx-auto mb-3" />
                            <p className="text-sm font-bold text-white mb-1">Warning</p>
                            <p className="text-xs text-gray-400">{warningText}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
