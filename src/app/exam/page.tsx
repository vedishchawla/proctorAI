"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Clock, FileText, ChevronRight, Shield, Plus, Loader2, LogOut } from "lucide-react";

interface ExamItem {
    _id: string;
    title: string;
    description: string;
    duration: number;
    questions: unknown[];
    isActive: boolean;
    createdAt?: string;
}

export default function ExamListPage() {
    const { user, loading: authLoading, signOut } = useAuth();
    const router = useRouter();
    const [exams, setExams] = useState<ExamItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchExams() {
            setLoading(true);
            try {
                const res = await fetch("/api/exams");
                const data = await res.json();
                if (data.exams && data.exams.length > 0) {
                    setExams(data.exams.filter((e: ExamItem) => e.isActive));
                } else {
                    setExams([]);
                }
            } catch (err) {
                console.error("Failed to fetch exams:", err);
                setError("Failed to load exams from database.");
            } finally {
                setLoading(false);
            }
        }
        fetchExams();
    }, []);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-surface-0 flex items-center justify-center font-mono text-xs text-gray-600">
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    authenticating...
                </motion.span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-0 relative">
            <div className="fixed inset-0 dot-grid z-0" />

            {/* Navbar */}
            <nav className="sticky top-0 z-50 glass flex items-center justify-between px-6 md:px-16 py-4">
                <a href="/" className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-hacker-green/10 border border-hacker-green/20 flex items-center justify-center">
                        <span className="text-hacker-green font-mono text-xs font-bold">P</span>
                    </div>
                    <span className="text-sm font-mono font-semibold text-white">
                        proctor<span className="text-hacker-green">AI</span>
                    </span>
                </a>
                <div className="flex items-center gap-3 font-mono text-xs text-gray-500">
                    <span>{user?.name}</span>
                    <div className="w-6 h-6 rounded-md bg-hacker-green/10 flex items-center justify-center text-[10px] font-bold text-hacker-green">
                        {user?.name?.charAt(0) || "S"}
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono text-gray-400 border border-white/5 hover:border-[#ff3366]/30 hover:text-[#ff3366] transition-all duration-300"
                        title="Sign out"
                    >
                        <LogOut className="w-3 h-3" />
                        logout
                    </button>
                </div>
            </nav>

            {/* Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
                <div className="font-mono text-[10px] text-gray-600 mb-4 space-y-1">
                    <p><span className="text-hacker-green/50">$</span> fetch exams --source mongodb --active-only</p>
                    {loading ? (
                        <p><Loader2 className="w-3 h-3 inline animate-spin" /> querying database...</p>
                    ) : error ? (
                        <p><span className="text-[#ff3366]">✗</span> {error}</p>
                    ) : (
                        <p><span className="text-hacker-green">✓</span> {exams.length} active exams found</p>
                    )}
                </div>

                <h1 className="text-2xl font-display font-bold text-white mb-2">Available Exams</h1>
                <p className="text-sm text-gray-500 mb-8">Select an exam to begin. Your webcam and microphone will be required.</p>

                {/* Loading skeleton */}
                {loading && (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="glass-card p-5">
                                <div className="h-4 w-48 bg-surface-3 rounded animate-pulse mb-3" />
                                <div className="h-3 w-72 bg-surface-3 rounded animate-pulse mb-3" />
                                <div className="flex gap-4">
                                    <div className="h-3 w-20 bg-surface-3 rounded animate-pulse" />
                                    <div className="h-3 w-24 bg-surface-3 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && exams.length === 0 && !error && (
                    <div className="glass-card p-8 text-center">
                        <FileText className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 mb-1">No active exams available</p>
                        <p className="text-xs text-gray-600 font-mono">
                            {user?.role === "admin"
                                ? "Create an exam from the admin dashboard."
                                : "Check back later or contact your administrator."}
                        </p>
                        {user?.role === "admin" && (
                            <button
                                onClick={() => router.push("/dashboard/exams")}
                                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono text-hacker-green border border-hacker-green/20 hover:border-glow transition-all"
                            >
                                <Plus className="w-3 h-3" /> Create Exam
                            </button>
                        )}
                    </div>
                )}

                {/* Exam list — from DB */}
                {!loading && exams.length > 0 && (
                    <div className="space-y-3">
                        {exams.map((exam, i) => (
                            <motion.div
                                key={exam._id}
                                className="glass-card p-5 cursor-pointer group"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                whileHover={{ x: 4 }}
                                onClick={() => router.push(`/exam/${exam._id}`)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-sm font-semibold text-white">{exam.title}</h3>
                                            <div className="status-dot live" />
                                        </div>
                                        <p className="text-xs text-gray-500 mb-3">{exam.description}</p>
                                        <div className="flex items-center gap-4 font-mono text-[10px] text-gray-600">
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" />
                                                {exam.duration} min
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <FileText className="w-3 h-3" />
                                                {exam.questions.length} questions
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Shield className="w-3 h-3 text-hacker-green" />
                                                AI Proctored
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-hacker-green group-hover:translate-x-1 transition-all duration-300" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                <div className="mt-8 flex items-start gap-3 px-4 py-3 rounded-lg bg-hacker-green/[0.03] border border-hacker-green/10">
                    <span className="text-hacker-green font-mono text-xs font-bold mt-0.5">!</span>
                    <p className="text-xs text-gray-400">
                        <span className="text-hacker-green font-medium">Before you begin:</span> Ensure your webcam and microphone are working.
                        A 30-second calibration phase will run before the exam starts. All AI analysis runs entirely in your browser — no video data is uploaded.
                    </p>
                </div>
            </div>
        </div>
    );
}
