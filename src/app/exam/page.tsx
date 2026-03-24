"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Clock, FileText, ChevronRight, Shield } from "lucide-react";

// Demo exams
const demoExams = [
    {
        _id: "demo-exam-1",
        title: "Data Structures & Algorithms",
        description: "Binary trees, graph traversal, dynamic programming, and sorting algorithms.",
        duration: 60,
        questions: Array(20).fill(null),
        isActive: true,
    },
    {
        _id: "demo-exam-2",
        title: "Web Development Fundamentals",
        description: "HTML/CSS, JavaScript, React basics, REST APIs, and HTTP protocols.",
        duration: 45,
        questions: Array(15).fill(null),
        isActive: true,
    },
    {
        _id: "demo-exam-3",
        title: "System Design Concepts",
        description: "Scalability, load balancing, caching, database sharding, and microservices.",
        duration: 90,
        questions: Array(10).fill(null),
        isActive: true,
    },
];

export default function ExamListPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [exams, setExams] = useState(demoExams);

    useEffect(() => {
        // Try to fetch real exams
        fetch("/api/exams")
            .then((res) => res.json())
            .then((data) => {
                if (data.exams && data.exams.length > 0) {
                    setExams(data.exams);
                }
            })
            .catch(() => {
                // Use demo data
            });
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-0 flex items-center justify-center font-mono text-xs text-gray-600">
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    loading exams...
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
                </div>
            </nav>

            {/* Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
                <div className="font-mono text-[10px] text-gray-600 mb-4 space-y-1">
                    <p><span className="text-hacker-green/50">$</span> fetching available exams...</p>
                    <p><span className="text-hacker-green">✓</span> {exams.length} exams found</p>
                </div>

                <h1 className="text-2xl font-display font-bold text-white mb-2">Available Exams</h1>
                <p className="text-sm text-gray-500 mb-8">Select an exam to begin. Your webcam and microphone will be required.</p>

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

                <div className="mt-8 flex items-start gap-3 px-4 py-3 rounded-lg bg-hacker-green/[0.03] border border-hacker-green/10">
                    <span className="text-hacker-green font-mono text-xs font-bold mt-0.5">!</span>
                    <p className="text-xs text-gray-400">
                        <span className="text-hacker-green font-medium">Before you begin:</span> Ensure your webcam and microphone are working.
                        A 30-second calibration phase will run before the exam starts. AI analysis runs entirely in your browser.
                    </p>
                </div>
            </div>
        </div>
    );
}
