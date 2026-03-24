"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useParams, useRouter } from "next/navigation";
import type { SignalSnapshot, IQuestion } from "@/types";
import { initPipeline, startCalibration, startAnalysis, stopPipeline } from "@/lib/ai/pipeline";
import { connectSocket, disconnectSocket, emitStudentJoin, emitSignalUpdate, emitViolation, emitStudentLeave, onAdminAction } from "@/lib/socket";
import { Shield, Camera, Mic, AlertTriangle, CheckCircle, Clock, ChevronRight, Volume2, Loader2, FileText, LogOut } from "lucide-react";

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
                <motion.circle cx={50} cy={50} r={radius} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={circumference} animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ filter: `drop-shadow(0 0 8px ${color}40)` }} />
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
                    <div key={i} className="w-1 rounded-full transition-all duration-150"
                        style={{
                            height: `${((i + 1) / bars) * 100}%`,
                            backgroundColor: active
                                ? i < 5 ? "rgba(0,255,136,0.6)" : i < 7 ? "rgba(255,184,0,0.6)" : "rgba(255,51,102,0.6)"
                                : "rgba(255,255,255,0.06)",
                        }} />
                );
            })}
        </div>
    );
}

// ── Channel Status ──────────────────────────────────
function ChannelDots({ snapshot }: { snapshot: SignalSnapshot | null }) {
    const channels = [
        { key: "face", label: "FACE", score: snapshot?.face.score ?? 0, conf: snapshot?.face.confidence ?? 0 },
        { key: "gaze", label: "GAZE", score: snapshot?.gaze.score ?? 0, conf: snapshot?.gaze.confidence ?? 0 },
        { key: "head", label: "HEAD", score: snapshot?.headPose.score ?? 0, conf: snapshot?.headPose.confidence ?? 0 },
        { key: "audio", label: "AUDIO", score: snapshot?.audio.score ?? 0, conf: snapshot?.audio.confidence ?? 0 },
        { key: "input", label: "INPUT", score: snapshot?.interaction.score ?? 0, conf: snapshot?.interaction.confidence ?? 0 },
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
                        <span className="text-gray-500 w-8">{ch.score.toFixed(2)}</span>
                        <div className="flex-1 h-[3px] bg-surface-3 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${ch.conf * 100}%`, backgroundColor: ch.score < 0.3 ? "#00ff88" : ch.score < 0.6 ? "#ffb800" : "#ff3366", opacity: 0.5 }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ═══════════════════════════════════════════════════════
// MAIN EXAM PAGE — Full MongoDB + AI Pipeline Integration
// ═══════════════════════════════════════════════════════
export default function ExamPage() {
    const { user, signOut } = useAuth();
    const params = useParams();
    const router = useRouter();
    const examId = params.id as string;
    const videoRef = useRef<HTMLVideoElement>(null);

    // Exam data from DB
    const [examData, setExamData] = useState<{ title: string; description: string; duration: number; questions: IQuestion[] } | null>(null);
    const [examLoading, setExamLoading] = useState(true);
    const [examError, setExamError] = useState("");

    // Session — stored in MongoDB
    const [sessionId, setSessionId] = useState<string | null>(null);

    // UI state
    const [phase, setPhase] = useState<"loading" | "permissions" | "calibrating" | "active" | "completed">("loading");
    const [calibrationProgress, setCalibrationProgress] = useState(0);
    const [trustScore, setTrustScore] = useState(100);
    const [snapshot, setSnapshot] = useState<SignalSnapshot | null>(null);
    const [audioLevel, setAudioLevel] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [timeLeft, setTimeLeft] = useState(3600);
    const [violations, setViolations] = useState<Array<{ type: string; time: string; severity: string }>>([]);
    const [warningVisible, setWarningVisible] = useState(false);
    const [warningText, setWarningText] = useState("");
    const [pipelineReady, setPipelineReady] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);
    const trustSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const signalThrottleRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const latestSnapshotRef = useRef<SignalSnapshot | null>(null);

    // ── 1. FETCH EXAM FROM MONGODB ──
    useEffect(() => {
        async function loadExam() {
            setExamLoading(true);
            try {
                const res = await fetch(`/api/exams/${examId}`);
                if (!res.ok) {
                    setExamError("Exam not found in database.");
                    setExamLoading(false);
                    return;
                }
                const data = await res.json();
                if (data.exam) {
                    setExamData({
                        title: data.exam.title,
                        description: data.exam.description,
                        duration: data.exam.duration,
                        questions: data.exam.questions,
                    });
                    setTimeLeft(data.exam.duration * 60);
                    setPhase("permissions");
                } else {
                    setExamError("Exam data is empty.");
                }
            } catch (err) {
                console.error("Failed to fetch exam:", err);
                setExamError("Failed to connect to database.");
            } finally {
                setExamLoading(false);
            }
        }
        loadExam();
    }, [examId]);

    // ── 2. CREATE SESSION IN MONGODB ──
    const createSession = useCallback(async () => {
        if (!user) return null;
        try {
            const res = await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    examId,
                    userId: user.uid || user.email,
                    userName: user.name,
                    userEmail: user.email,
                }),
            });
            const data = await res.json();
            if (data.session?._id) {
                setSessionId(data.session._id);
                return data.session._id;
            }
        } catch (err) {
            console.error("Failed to create session:", err);
        }
        return null;
    }, [examId, user]);

    // ── 3. SYNC TRUST SCORE TO MONGODB (every 30s) ──
    const startTrustSync = useCallback((sid: string) => {
        if (trustSyncRef.current) clearInterval(trustSyncRef.current);
        trustSyncRef.current = setInterval(async () => {
            try {
                await fetch(`/api/sessions/${sid}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ trustScore }),
                });
            } catch (err) {
                console.error("Trust sync failed:", err);
            }
        }, 30000);
    }, [trustScore]);

    // ── 4. REQUEST PERMISSIONS + INIT AI + CREATE SESSION ──
    const requestPermissions = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            // Create session in MongoDB
            const sid = await createSession();

            // Connect Socket.IO
            try {
                const sock = connectSocket();
                sock.on("connect", () => setSocketConnected(true));
                sock.on("disconnect", () => setSocketConnected(false));

                if (sid && user) {
                    emitStudentJoin({
                        sessionId: sid,
                        examId,
                        userId: user.uid || user.email,
                        userName: user.name || user.email,
                    });
                }

                // Listen for admin actions
                onAdminAction((data) => {
                    if (data.action === "warned") {
                        setWarningText(data.note || "Admin has issued a warning.");
                        setWarningVisible(true);
                        setTimeout(() => setWarningVisible(false), 5000);
                    }
                });
            } catch (err) {
                console.warn("Socket.IO unavailable — continuing without real-time", err);
            }

            // Init the real AI pipeline
            const ready = await initPipeline({
                videoElement: videoRef.current!,
                mediaStream: stream,
                onSnapshot: (snap: SignalSnapshot) => {
                    setSnapshot(snap);
                    setTrustScore(snap.trustScore);
                    latestSnapshotRef.current = snap;
                    if (snap.audio.rawData?.volume !== undefined) {
                        setAudioLevel(snap.audio.rawData.volume as number);
                    }
                },
                onViolation: (v: unknown) => {
                    const violation = v as { type: string; severity: string; description: string };
                    setViolations((prev) => [
                        ...prev,
                        { type: violation.type, time: new Date().toLocaleTimeString(), severity: violation.severity },
                    ]);
                    if (violation.severity === "high" || violation.severity === "critical") {
                        setWarningText(violation.description);
                        setWarningVisible(true);
                        setTimeout(() => setWarningVisible(false), 4000);
                    }
                    // Save violation to MongoDB + emit via Socket.IO
                    if (sid) {
                        fetch("/api/violations", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                sessionId: sid,
                                type: violation.type,
                                severity: violation.severity,
                                description: violation.description,
                                channels: [],
                                scores: {},
                                adminAction: "pending",
                            }),
                        }).catch(() => {});

                        // Real-time violation to admin via Socket.IO
                        emitViolation({
                            sessionId: sid,
                            type: violation.type,
                            severity: violation.severity,
                            description: violation.description,
                            channels: [],
                        });
                    }
                },
                onTrustUpdate: (data: { trustScore: number }) => {
                    setTrustScore(data.trustScore);
                },
                onCalibrationProgress: (data: { progress: number }) => {
                    setCalibrationProgress(data.progress * 100);
                },
            });

            setPipelineReady(ready);
            setPhase("calibrating");

            // Update session status in DB
            if (sid) {
                fetch(`/api/sessions/${sid}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "calibrating" }),
                }).catch(() => {});
            }

            // Run real calibration
            if (ready && videoRef.current) {
                await startCalibration(videoRef.current);
                setPhase("active");
                startAnalysis(videoRef.current);

                // Update session to active + start trust sync + socket signal streaming
                if (sid) {
                    fetch(`/api/sessions/${sid}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "active" }),
                    }).catch(() => {});
                    startTrustSync(sid);

                    // Stream signals via Socket.IO (throttled to 1/s)
                    signalThrottleRef.current = setInterval(() => {
                        if (latestSnapshotRef.current) {
                            emitSignalUpdate({ sessionId: sid, snapshot: latestSnapshotRef.current });
                        }
                    }, 1000);
                }
            } else {
                // Fallback if pipeline fails — still run exam
                let progress = 0;
                const calibInterval = setInterval(() => {
                    progress += 100 / 30;
                    setCalibrationProgress(Math.min(100, progress));
                    if (progress >= 100) {
                        clearInterval(calibInterval);
                        setPhase("active");
                        if (sid) {
                            fetch(`/api/sessions/${sid}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "active" }),
                            }).catch(() => {});
                            startTrustSync(sid);
                        }
                    }
                }, 1000);
            }
        } catch {
            alert("Camera and microphone access are required for the proctored exam.");
        }
    }, [createSession, startTrustSync]);

    // ── Timer ──
    useEffect(() => {
        if (phase !== "active") return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    submitExam();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [phase]);

    // ── Cleanup ──
    useEffect(() => {
        return () => {
            stopPipeline();
            if (trustSyncRef.current) clearInterval(trustSyncRef.current);
            if (signalThrottleRef.current) clearInterval(signalThrottleRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
            if (sessionId) emitStudentLeave(sessionId);
            disconnectSocket();
        };
    }, []);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };

    // ── 5. SUBMIT EXAM — save answers + status to MongoDB ──
    const submitExam = async () => {
        stopPipeline();
        if (trustSyncRef.current) clearInterval(trustSyncRef.current);
        if (signalThrottleRef.current) clearInterval(signalThrottleRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        if (sessionId) emitStudentLeave(sessionId);
        disconnectSocket();

        // Save final state to MongoDB
        if (sessionId) {
            try {
                await fetch(`/api/sessions/${sessionId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        status: "completed",
                        trustScore,
                        answers,
                        endTime: new Date().toISOString(),
                        totalViolations: violations.length,
                    }),
                });
            } catch (err) {
                console.error("Failed to save exam:", err);
            }
        }

        setPhase("completed");
    };

    const questions = examData?.questions || [];

    // ══ LOADING PHASE — fetching exam from DB ══
    if (phase === "loading" || examLoading) {
        return (
            <div className="min-h-screen bg-surface-0 flex items-center justify-center relative">
                <div className="fixed inset-0 dot-grid z-0" />
                <div className="relative z-10 text-center">
                    <Loader2 className="w-6 h-6 text-hacker-green mx-auto mb-4 animate-spin" />
                    <p className="font-mono text-xs text-gray-500">Fetching exam from MongoDB...</p>
                    <p className="font-mono text-[10px] text-gray-700 mt-1">ID: {examId}</p>
                </div>
            </div>
        );
    }

    // ══ ERROR PHASE ══
    if (examError) {
        return (
            <div className="min-h-screen bg-surface-0 flex items-center justify-center relative">
                <div className="fixed inset-0 dot-grid z-0" />
                <div className="relative z-10 max-w-sm px-6 text-center">
                    <AlertTriangle className="w-8 h-8 text-[#ff3366] mx-auto mb-4" />
                    <h2 className="text-lg font-display font-bold text-white mb-2">Exam Not Found</h2>
                    <p className="text-xs text-gray-500 mb-4">{examError}</p>
                    <p className="text-[10px] text-gray-700 font-mono mb-6">
                        Make sure exams are seeded: <span className="text-hacker-green">POST /api/seed</span>
                    </p>
                    <button
                        onClick={() => router.push("/exam")}
                        className="px-4 py-2 rounded-lg text-xs font-mono text-gray-400 border border-subtle hover:border-glow transition-all"
                    >
                        ← back to exams
                    </button>
                </div>
            </div>
        );
    }

    // ══ PERMISSIONS PHASE ══
    if (phase === "permissions") {
        return (
            <div className="min-h-screen bg-surface-0 flex items-center justify-center relative">
                <div className="fixed inset-0 dot-grid z-0" />
                <div className="relative z-10 max-w-md px-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-6 rounded-xl bg-hacker-green/10 border border-hacker-green/20 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-hacker-green" />
                    </div>
                    <h1 className="text-xl font-display font-bold text-white mb-1">{examData?.title}</h1>
                    <p className="text-xs text-gray-500 mb-6">{examData?.description}</p>

                    <div className="glass-card p-5 space-y-3 mb-6 text-left">
                        {[
                            { icon: Camera, label: "Camera — face detection, gaze tracking, head pose estimation" },
                            { icon: Mic, label: "Microphone — speech detection via FFT analysis" },
                            { icon: Shield, label: "All AI runs in-browser — zero data uploaded to cloud" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <item.icon className="w-4 h-4 text-hacker-green flex-shrink-0" />
                                <span className="text-xs text-gray-400">{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="glass-card p-4 mb-6 text-left">
                        <p className="font-mono text-[10px] text-gray-500 mb-2">EXAM INFO — from MongoDB</p>
                        <div className="space-y-1.5 font-mono text-xs">
                            <div className="flex justify-between"><span className="text-gray-600">Questions</span><span className="text-white">{questions.length}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Duration</span><span className="text-white">{examData?.duration} min</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Total Points</span><span className="text-white">{questions.reduce((s, q) => s + q.points, 0)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Calibration</span><span className="text-white">30 sec</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Exam ID</span><span className="text-gray-500">{examId.slice(-8)}</span></div>
                        </div>
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

    // ══ CALIBRATING PHASE ══
    if (phase === "calibrating") {
        return (
            <div className="min-h-screen bg-surface-0 flex items-center justify-center relative">
                <div className="fixed inset-0 dot-grid z-0" />
                <div className="relative z-10 max-w-lg px-6 text-center">
                    <div className="relative w-48 h-48 mx-auto mb-8">
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover rounded-2xl border border-subtle" />
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 192 192">
                            <circle cx={96} cy={96} r={90} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                            <motion.circle cx={96} cy={96} r={90} fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 90}
                                animate={{ strokeDashoffset: 2 * Math.PI * 90 * (1 - calibrationProgress / 100) }}
                                transition={{ duration: 0.5 }}
                                style={{ filter: "drop-shadow(0 0 6px rgba(0,255,136,0.3))" }} />
                        </svg>
                        <div className="absolute inset-0 rounded-2xl overflow-hidden scan-line" />
                    </div>

                    <h2 className="text-lg font-display font-bold text-white mb-2">Calibrating AI Pipeline</h2>
                    <p className="text-xs text-gray-500 mb-2">Sampling baseline. Session ID: <span className="text-hacker-green">{sessionId?.slice(-8) || "creating..."}</span></p>
                    <p className="text-xs text-gray-600 mb-4">Look straight at the screen. Stay still. Keep your environment quiet.</p>
                    <p className="font-mono text-sm text-hacker-green glow-green">{Math.round(calibrationProgress)}%</p>

                    <div className="mt-6 font-mono text-[10px] text-gray-700 space-y-0.5">
                        <p>{calibrationProgress > 10 ? "✓" : "○"} Face detection model loaded</p>
                        <p>{calibrationProgress > 30 ? "✓" : "○"} Gaze baseline sampling...</p>
                        <p>{calibrationProgress > 50 ? "✓" : "○"} Head pose baseline sampling...</p>
                        <p>{calibrationProgress > 70 ? "✓" : "○"} Ambient audio level recording...</p>
                        <p>{calibrationProgress > 90 ? "✓" : "○"} Thresholds calibrated</p>
                    </div>
                </div>
            </div>
        );
    }

    // ══ COMPLETED PHASE ══
    if (phase === "completed") {
        const answeredCount = Object.keys(answers).length;
        const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
        return (
            <div className="min-h-screen bg-surface-0 flex items-center justify-center relative">
                <div className="fixed inset-0 dot-grid z-0" />
                <div className="relative z-10 max-w-md px-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-6 rounded-xl bg-hacker-green/10 border border-hacker-green/20 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-hacker-green" />
                    </div>
                    <h1 className="text-xl font-display font-bold text-white mb-2">Exam Submitted</h1>
                    <p className="text-xs text-gray-500 mb-6">Results saved to MongoDB. Session finalized.</p>

                    <div className="glass-card p-5 space-y-3 text-left font-mono text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">Exam</span><span className="text-white">{examData?.title}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Questions answered</span><span className="text-white">{answeredCount}/{questions.length}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Total points</span><span className="text-white">{totalPoints}</span></div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Final trust score</span>
                            <span className={trustScore >= 70 ? "text-hacker-green" : trustScore >= 40 ? "text-[#ffb800]" : "text-[#ff3366]"}>{trustScore}</span>
                        </div>
                        <div className="flex justify-between"><span className="text-gray-500">Violations flagged</span><span className={violations.length === 0 ? "text-hacker-green" : "text-[#ffb800]"}>{violations.length}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Session ID</span><span className="text-gray-600">{sessionId?.slice(-8) || "—"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">DB status</span><span className="text-hacker-green">saved ✓</span></div>
                    </div>

                    {violations.length > 0 && (
                        <div className="glass-card p-4 mt-3 text-left">
                            <p className="font-mono text-[9px] text-[#ffb800] mb-2">VIOLATIONS LOG</p>
                            {violations.map((v, i) => (
                                <div key={i} className="flex items-center gap-2 py-1 font-mono text-[10px]">
                                    <AlertTriangle className="w-2.5 h-2.5 text-[#ffb800]" />
                                    <span className="text-gray-500">{v.type.replace(/_/g, " ")}</span>
                                    <span className="text-gray-700 ml-auto">{v.time}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 flex flex-col gap-3">
                        <motion.button
                            onClick={() => window.print()}
                            className="w-full px-6 py-3 rounded-lg text-xs font-mono font-bold text-black bg-hacker-green hover:shadow-glow-green transition-all flex items-center justify-center gap-2 print:hidden"
                            whileHover={{ scale: 1.02 }}
                        >
                            <FileText className="w-4 h-4" /> Download PDF Report
                        </motion.button>
                        
                        <div className="flex gap-3 print:hidden">
                            <motion.button
                                onClick={() => router.push("/exam")}
                                className="flex-1 px-4 py-2.5 rounded-lg text-xs font-mono text-gray-400 border border-subtle hover:border-glow hover:text-white transition-all"
                                whileHover={{ scale: 1.02 }}
                            >
                                ← back to exams
                            </motion.button>
                            <motion.button
                                onClick={async () => {
                                    await signOut();
                                    router.push("/");
                                }}
                                className="flex-1 px-4 py-2.5 rounded-lg text-xs font-mono text-gray-400 border border-subtle hover:border-[#ff3366] hover:text-[#ff3366] transition-all flex items-center justify-center gap-2"
                                whileHover={{ scale: 1.02 }}
                            >
                                <LogOut className="w-3.5 h-3.5" /> Sign out
                            </motion.button>
                        </div>
                    </div>
                </div>
                
                {/* Print-only CSS specifically for the PDF Report */}
                <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                        * {
                            -webkit-print-color-adjust: exact !important; 
                            color-adjust: exact !important;
                            color: black !important;
                            background: transparent !important;
                            box-shadow: none !important;
                            text-shadow: none !important;
                            /* Reset heights and overflows to prevent clipping */
                            height: auto !important;
                            min-height: 0 !important;
                            overflow: visible !important;
                        }
                        
                        body, html, .bg-surface-0, .bg-surface-1, .bg-surface-2, .bg-surface-3 { 
                            background-color: white !important; 
                        }
                        
                        /* Layout fixes: Remove center alignment */
                        .min-h-screen { display: block !important; padding: 20px !important; }
                        .max-w-md { max-width: 100% !important; margin: 0 !important; text-align: left !important; }
                        .mx-auto { margin-left: 0 !important; }
                        .text-center { text-align: left !important; }
                        
                        /* Clean up the card container */
                        .glass-card { 
                            border: 1px solid #000 !important; 
                            padding: 20px !important; 
                            margin-bottom: 20px !important; 
                        }
                        
                        /* Ensure table-like structure looks good */
                        .flex.justify-between { 
                            display: flex !important;
                            justify-content: space-between !important;
                            border-bottom: 1px solid #ccc !important; 
                            padding: 12px 0 !important; 
                        }
                        
                        /* Hide decorative elements and buttons */
                        .dot-grid, .scan-line, .print\\:hidden, button { display: none !important; }
                        
                        /* Exception for icons if they are SVG, force them to black */
                        svg { stroke: black !important; }
                    }
                `}} />
            </div>
        );
    }

    // ══ ACTIVE EXAM PHASE ══
    return (
        <div className="min-h-screen bg-surface-0 flex flex-col">
            {/* Top bar */}
            <header className="sticky top-0 z-50 glass flex items-center justify-between px-4 py-2 border-b border-subtle">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-hacker-green/10 flex items-center justify-center">
                        <span className="text-hacker-green font-mono text-[10px] font-bold">P</span>
                    </div>
                    <span className="font-mono text-xs text-gray-500">Q{currentQuestion + 1}/{questions.length}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-2 text-gray-600">{examData?.title}</span>
                </div>

                <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${timeLeft < 300 ? "text-[#ff3366]" : "text-white"}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(timeLeft)}
                    {timeLeft < 300 && <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-[#ff3366]" />}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${pipelineReady ? "bg-hacker-green" : "bg-[#ffb800]"}`} />
                        <span className="font-mono text-[9px] text-gray-600">{pipelineReady ? "AI active" : "AI loading"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${sessionId ? "bg-hacker-green" : "bg-[#ffb800]"}`} />
                        <span className="font-mono text-[9px] text-gray-600">{sessionId ? "DB synced" : "DB pending"}</span>
                    </div>
                    <motion.button
                        onClick={submitExam}
                        className="px-4 py-1.5 rounded-md text-xs font-mono font-bold text-black bg-hacker-green hover:shadow-glow-green transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        submit exam
                    </motion.button>
                </div>
            </header>

            {/* 3-panel layout */}
            <div className="flex-1 flex">
                {/* Left — Questions from DB */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-xl">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="section-label">question {currentQuestion + 1}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-hacker-green/10 text-hacker-green">{questions[currentQuestion]?.points} pts</span>
                        </div>
                        <h2 className="text-base font-display font-semibold text-white mt-2 mb-6 leading-relaxed">
                            {questions[currentQuestion]?.text}
                        </h2>

                        <div className="space-y-2">
                            {questions[currentQuestion]?.options.map((opt, i) => (
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
                            <div className="flex gap-1.5">
                                {questions.map((_, i) => (
                                    <button key={i} onClick={() => setCurrentQuestion(i)}
                                        className={`w-2 h-2 rounded-full transition-all ${
                                            i === currentQuestion ? "bg-hacker-green shadow-glow-green scale-125" :
                                            answers[i] !== undefined ? "bg-hacker-green/30" : "bg-gray-700"
                                        }`} />
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
                <div className="w-72 border-l border-subtle p-4 flex flex-col gap-4 overflow-y-auto">
                    <div className="relative rounded-xl overflow-hidden border border-subtle">
                        <video ref={videoRef} autoPlay muted playsInline className="w-full aspect-[4/3] object-cover" />
                        <div className="absolute inset-0 scan-line opacity-30" />
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 font-mono text-[9px]">
                            <div className="status-dot live" />
                            <span className="text-hacker-green">REC</span>
                        </div>
                        {snapshot?.face.rawData?.faceCount !== undefined && (
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 font-mono text-[9px] text-gray-400">
                                faces: <span className={`${(snapshot.face.rawData.faceCount as number) === 1 ? "text-hacker-green" : "text-[#ff3366]"}`}>
                                    {snapshot.face.rawData.faceCount as number}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-center"><TrustGauge score={trustScore} /></div>

                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2 font-mono text-[10px] text-gray-600">
                            <Volume2 className="w-3 h-3" /><span>AUDIO</span>
                        </div>
                        <AudioMeter level={audioLevel} />
                    </div>

                    <div className="glass-card p-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="font-mono text-[9px] text-gray-600 uppercase tracking-wider">Signal Channels</p>
                            <p className="font-mono text-[9px] text-gray-700">2fps</p>
                        </div>
                        <ChannelDots snapshot={snapshot} />
                    </div>

                    {snapshot && (
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-1 border border-subtle font-mono text-[10px]">
                            <span className="text-gray-600">FUSION</span>
                            <span className={`font-bold ${snapshot.fusedScore < 0.3 ? "text-hacker-green" : snapshot.fusedScore < 0.6 ? "text-[#ffb800]" : "text-[#ff3366]"}`}>
                                {snapshot.fusedScore.toFixed(3)}
                            </span>
                        </div>
                    )}

                    {/* DB sync indicator */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-1 border border-subtle font-mono text-[10px]">
                        <span className="text-gray-600">MongoDB</span>
                        <span className={sessionId ? "text-hacker-green" : "text-[#ffb800]"}>
                            {sessionId ? `syncing · ${sessionId.slice(-6)}` : "no session"}
                        </span>
                    </div>

                    {violations.length > 0 && (
                        <div className="glass-card p-3">
                            <p className="font-mono text-[9px] text-[#ff3366] mb-2">VIOLATIONS ({violations.length})</p>
                            {violations.slice(-4).map((v, i) => (
                                <div key={i} className="flex items-center gap-2 py-1">
                                    <AlertTriangle className="w-2.5 h-2.5 text-[#ff3366] flex-shrink-0" />
                                    <span className="text-[10px] text-gray-500 font-mono truncate">{v.type.replace(/_/g, " ")}</span>
                                    <span className="text-[9px] text-gray-700 font-mono ml-auto flex-shrink-0">{v.time}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Warning overlay */}
            <AnimatePresence>
                {warningVisible && (
                    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#ff3366]/10 backdrop-blur-sm"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="glass-card px-8 py-6 text-center border-[#ff3366]/20 max-w-sm"
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
                            <AlertTriangle className="w-8 h-8 text-[#ff3366] mx-auto mb-3" />
                            <p className="text-sm font-bold text-white mb-1">Violation Detected</p>
                            <p className="text-xs text-gray-400">{warningText}</p>
                            <p className="text-[10px] text-gray-600 mt-3 font-mono">Logged to MongoDB for admin review.</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
