"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { useParams, useRouter } from "next/navigation";
import type { SignalSnapshot, IQuestion } from "@/types";
import { initPipeline, startCalibration, startAnalysis, stopPipeline } from "@/lib/ai/pipeline";
import { connectSocket, disconnectSocket, emitStudentJoin, emitSignalUpdate, emitViolation, emitStudentLeave, onAdminAction } from "@/lib/socket";
import ProctorOverlay from "@/components/ProctorOverlay";
import { Shield, Camera, Mic, AlertTriangle, CheckCircle, Clock, ChevronRight, Loader2, Code2, FileText } from "lucide-react";

// Dynamic import for Monaco (heavy component)
const CodeEditor = dynamic(() => import("@/components/CodeEditor"), {
    ssr: false,
    loading: () => (
        <div className="flex-1 flex items-center justify-center bg-[#1e1e1e] rounded-xl border border-subtle">
            <div className="text-center">
                <Loader2 className="w-5 h-5 text-hacker-green mx-auto mb-2 animate-spin" />
                <p className="font-mono text-xs text-gray-600">Loading code editor...</p>
            </div>
        </div>
    ),
});

// ═══════════════════════════════════════════════════════
// MAIN EXAM PAGE — Full MongoDB + AI Pipeline + Code Editor
// ═══════════════════════════════════════════════════════
export default function ExamPage() {
    const { user } = useAuth();
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
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [codeAnswers, setCodeAnswers] = useState<Record<number, { code: string; language: string }>>({});
    const [timeLeft, setTimeLeft] = useState(3600);
    const [violations, setViolations] = useState<Array<{ type: string; time: string; severity: string }>>([]);
    const [warningVisible, setWarningVisible] = useState(false);
    const [warningText, setWarningText] = useState("");
    const [pipelineReady, setPipelineReady] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);
    const [proctorCompact, setProctorCompact] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);
    const trustSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const signalThrottleRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const latestSnapshotRef = useRef<SignalSnapshot | null>(null);

    // Determine if current question is coding type
    const questions = examData?.questions || [];
    const currentQ = questions[currentQuestion];
    const isCodingQuestion = currentQ?.type === "coding";

    // Auto-switch to compact proctor when coding question
    useEffect(() => {
        if (phase === "active" && isCodingQuestion) {
            setProctorCompact(true);
        }
    }, [currentQuestion, phase, isCodingQuestion]);

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
                    userId: user.firebaseUID || user.email,
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
                        userId: user.firebaseUID || user.email,
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
    }, [createSession, startTrustSync, examId, user]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                        answers: { ...answers, ...codeAnswers },
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

    // ══ LOADING PHASE ══
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
        const hasCoding = questions.some((q) => q.type === "coding");
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
                            ...(hasCoding ? [{ icon: Code2, label: "Code editor with syntax highlighting & test runner" }] : []),
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
                            <div className="flex justify-between">
                                <span className="text-gray-600">Question Types</span>
                                <span className="text-white">
                                    {questions.filter((q) => q.type === "mcq" || !q.type).length} MCQ
                                    {hasCoding && `, ${questions.filter((q) => q.type === "coding").length} Coding`}
                                </span>
                            </div>
                            <div className="flex justify-between"><span className="text-gray-600">Calibration</span><span className="text-white">30 sec</span></div>
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
        const answeredMCQ = Object.keys(answers).length;
        const answeredCode = Object.keys(codeAnswers).length;
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
                        <div className="flex justify-between"><span className="text-gray-500">MCQ answered</span><span className="text-white">{answeredMCQ}/{questions.filter((q) => q.type !== "coding").length}</span></div>
                        {answeredCode > 0 && <div className="flex justify-between"><span className="text-gray-500">Code submitted</span><span className="text-white">{answeredCode}/{questions.filter((q) => q.type === "coding").length}</span></div>}
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
                    {isCodingQuestion ? (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 flex items-center gap-1">
                            <Code2 className="w-2.5 h-2.5" /> CODING
                        </span>
                    ) : (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-2 text-gray-600 flex items-center gap-1">
                            <FileText className="w-2.5 h-2.5" /> MCQ
                        </span>
                    )}
                    <span className="font-mono text-[10px] text-gray-700 hidden md:inline">{examData?.title}</span>
                </div>

                <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${timeLeft < 300 ? "text-[#ff3366]" : "text-white"}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(timeLeft)}
                    {timeLeft < 300 && <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-[#ff3366]" />}
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${pipelineReady ? "bg-hacker-green" : "bg-[#ffb800]"}`} />
                        <span className="font-mono text-[9px] text-gray-600">{pipelineReady ? "AI active" : "AI loading"}</span>
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

            {/* Main content area */}
            <div className="flex-1 flex min-h-0">
                {isCodingQuestion ? (
                    /* ══ CODING QUESTION LAYOUT ══ */
                    <div className="flex-1 flex min-h-0">
                        {/* Left panel — Question */}
                        <div className="w-[40%] min-w-[320px] border-r border-subtle flex flex-col">
                            <div className="flex-1 p-5 overflow-y-auto">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="section-label">question {currentQuestion + 1}</span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8b5cf6]/10 text-[#8b5cf6]">{currentQ?.points} pts</span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-2 text-gray-600">coding</span>
                                </div>
                                <h2 className="text-sm font-display font-semibold text-white leading-relaxed mb-4 whitespace-pre-wrap">
                                    {currentQ?.text}
                                </h2>

                                {/* Test cases preview */}
                                {currentQ?.testCases && currentQ.testCases.filter((t) => !t.isHidden).length > 0 && (
                                    <div className="space-y-2 mt-4">
                                        <p className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">Sample Test Cases</p>
                                        {currentQ.testCases.filter((t) => !t.isHidden).map((tc, i) => (
                                            <div key={i} className="glass-card p-3 font-mono text-xs space-y-1">
                                                <div><span className="text-gray-600">Input:</span> <span className="text-gray-400">{tc.input}</span></div>
                                                <div><span className="text-gray-600">Output:</span> <span className="text-hacker-green">{tc.expectedOutput}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Question navigation */}
                            <div className="px-5 py-3 border-t border-subtle flex items-center justify-between">
                                <button
                                    onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
                                    disabled={currentQuestion === 0}
                                    className="px-3 py-1.5 rounded-lg text-xs font-mono text-gray-500 border border-subtle hover:border-glow disabled:opacity-30 transition-all"
                                >
                                    ← prev
                                </button>
                                <div className="flex gap-1.5">
                                    {questions.map((q, i) => (
                                        <button key={i} onClick={() => setCurrentQuestion(i)}
                                            className={`w-2 h-2 rounded-full transition-all ${i === currentQuestion ? "bg-hacker-green shadow-glow-green scale-125" :
                                                (q.type === "coding" ? codeAnswers[i] : answers[i] !== undefined) ? "bg-hacker-green/30" : "bg-gray-700"
                                                }`} />
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentQuestion((p) => Math.min(questions.length - 1, p + 1))}
                                    disabled={currentQuestion === questions.length - 1}
                                    className="px-3 py-1.5 rounded-lg text-xs font-mono text-gray-500 border border-subtle hover:border-glow disabled:opacity-30 transition-all flex items-center gap-1"
                                >
                                    next <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Right panel — Code Editor */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <CodeEditor
                                starterCode={currentQ?.starterCode}
                                languages={currentQ?.languages}
                                testCases={currentQ?.testCases}
                                onCodeChange={(code, language) => {
                                    setCodeAnswers((prev) => ({ ...prev, [currentQuestion]: { code, language } }));
                                }}
                            />
                        </div>

                        {/* Compact proctor overlay */}
                        <ProctorOverlay
                            videoRef={videoRef}
                            snapshot={snapshot}
                            trustScore={trustScore}
                            violations={violations}
                            pipelineReady={pipelineReady}
                            sessionId={sessionId}
                            socketConnected={socketConnected}
                            compact={true}
                            onToggleCompact={() => setProctorCompact(!proctorCompact)}
                        />
                    </div>
                ) : (
                    /* ══ MCQ QUESTION LAYOUT ══ */
                    <>
                        {/* Left — Questions from DB */}
                        <div className="flex-1 p-6 overflow-y-auto">
                            <div className="max-w-xl">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="section-label">question {currentQuestion + 1}</span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-hacker-green/10 text-hacker-green">{currentQ?.points} pts</span>
                                </div>
                                <h2 className="text-base font-display font-semibold text-white mt-2 mb-6 leading-relaxed">
                                    {currentQ?.text}
                                </h2>

                                <div className="space-y-2">
                                    {currentQ?.options?.map((opt, i) => (
                                        <motion.button
                                            key={i}
                                            onClick={() => setAnswers({ ...answers, [currentQuestion]: i })}
                                            className={`w-full text-left glass-card p-4 text-sm transition-all duration-300 ${answers[currentQuestion] === i
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
                                        {questions.map((q, i) => (
                                            <button key={i} onClick={() => setCurrentQuestion(i)}
                                                className={`w-2 h-2 rounded-full transition-all ${i === currentQuestion ? "bg-hacker-green shadow-glow-green scale-125" :
                                                    (q.type === "coding" ? codeAnswers[i] : answers[i] !== undefined) ? "bg-hacker-green/30" : "bg-gray-700"
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

                        {/* Right — Full Proctor Overlay */}
                        <ProctorOverlay
                            videoRef={videoRef}
                            snapshot={snapshot}
                            trustScore={trustScore}
                            violations={violations}
                            pipelineReady={pipelineReady}
                            sessionId={sessionId}
                            socketConnected={socketConnected}
                            compact={false}
                            onToggleCompact={() => setProctorCompact(!proctorCompact)}
                        />
                    </>
                )}
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
