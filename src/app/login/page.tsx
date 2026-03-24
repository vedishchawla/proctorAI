"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Shield, Eye, ChevronRight, Sparkles, Lock, Users } from "lucide-react";
import type { UserRole } from "@/types";

export default function LoginPage() {
    const { user, loading, signInWithGoogle, setUserRole } = useAuth();
    const router = useRouter();
    const [showRoleSelect, setShowRoleSelect] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Track mouse for gradient follow effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    // Redirect if logged in with role
    useEffect(() => {
        if (!loading && user && user.role && !showRoleSelect) {
            router.push(user.role === "admin" ? "/dashboard" : "/exam");
        }
    }, [user, loading, router, showRoleSelect]);

    const handleGoogleSignIn = async () => {
        setIsSigningIn(true);
        try {
            await signInWithGoogle();
            setShowRoleSelect(true);
        } catch {
            console.error("Sign-in failed");
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleRoleSelect = async (role: UserRole) => {
        setSelectedRole(role);
        await setUserRole(role);
        router.push(role === "admin" ? "/dashboard" : "/exam");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-0 flex items-center justify-center">
                <motion.div
                    className="w-12 h-12 rounded-full border-2 border-transparent border-t-cyber-cyan"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-0 relative overflow-hidden flex items-center justify-center">
            {/* Animated background gradient that follows mouse */}
            <div
                className="pointer-events-none fixed inset-0 z-0 transition-all duration-700 ease-out"
                style={{
                    background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 212, 255, 0.04), rgba(99, 102, 241, 0.03), transparent 60%)`,
                }}
            />

            {/* Grid background */}
            <div className="fixed inset-0 grid-bg z-0" />

            {/* Floating orbs */}
            <div className="fixed inset-0 z-0 overflow-hidden">
                <motion.div
                    className="absolute w-96 h-96 rounded-full"
                    style={{
                        background: "radial-gradient(circle, rgba(0, 212, 255, 0.08) 0%, transparent 70%)",
                        top: "10%",
                        right: "10%",
                    }}
                    animate={{
                        y: [0, -40, 20, 0],
                        x: [0, 20, -10, 0],
                        scale: [1, 1.1, 0.95, 1],
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute w-72 h-72 rounded-full"
                    style={{
                        background: "radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%)",
                        bottom: "15%",
                        left: "5%",
                    }}
                    animate={{
                        y: [0, 30, -20, 0],
                        x: [0, -15, 25, 0],
                        scale: [1, 0.9, 1.05, 1],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute w-64 h-64 rounded-full"
                    style={{
                        background: "radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)",
                        top: "50%",
                        left: "50%",
                    }}
                    animate={{
                        y: [0, -25, 15, 0],
                        scale: [1, 1.15, 0.9, 1],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            {/* Scan line effect */}
            <div className="fixed inset-0 z-0 scan-line" />

            {/* Main content */}
            <div className="relative z-10 w-full max-w-lg px-6">
                <AnimatePresence mode="wait">
                    {!showRoleSelect ? (
                        <motion.div
                            key="login"
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -30, scale: 0.95 }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {/* Logo + Title */}
                            <motion.div
                                className="text-center mb-10"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.6 }}
                            >
                                <motion.div
                                    className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyber-cyan to-cyber-indigo flex items-center justify-center shadow-glow-cyan"
                                    animate={{
                                        boxShadow: [
                                            "0 0 20px rgba(0, 210, 255, 0.15), 0 0 40px rgba(0, 210, 255, 0.05)",
                                            "0 0 30px rgba(0, 210, 255, 0.25), 0 0 60px rgba(0, 210, 255, 0.1)",
                                            "0 0 20px rgba(0, 210, 255, 0.15), 0 0 40px rgba(0, 210, 255, 0.05)",
                                        ],
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                >
                                    <Shield className="w-8 h-8 text-white" />
                                </motion.div>

                                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                                    Welcome to <span className="gradient-text">ProctorAI</span>
                                </h1>
                                <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
                                    AI-powered exam surveillance with 5-channel behavioral analysis.
                                    Sign in to get started.
                                </p>
                            </motion.div>

                            {/* Login Card */}
                            <motion.div
                                className="glass-card p-8"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.6 }}
                            >
                                {/* Feature badges */}
                                <div className="flex justify-center gap-3 mb-8">
                                    {[
                                        { icon: Eye, label: "AI Monitoring" },
                                        { icon: Lock, label: "Privacy First" },
                                        { icon: Sparkles, label: "Real-time" },
                                    ].map((item, i) => (
                                        <motion.div
                                            key={item.label}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-subtle text-xs text-gray-400"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.6 + i * 0.1 }}
                                        >
                                            <item.icon className="w-3 h-3 text-cyber-cyan" />
                                            {item.label}
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Google Sign-In */}
                                <motion.button
                                    onClick={handleGoogleSignIn}
                                    disabled={isSigningIn}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white/5 border border-subtle hover:border-glow hover:bg-white/10 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {isSigningIn ? (
                                        <motion.div
                                            className="w-5 h-5 rounded-full border-2 border-transparent border-t-cyber-cyan"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        />
                                    ) : (
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                                fill="#4285F4"
                                            />
                                            <path
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                fill="#34A853"
                                            />
                                            <path
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                fill="#FBBC05"
                                            />
                                            <path
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                fill="#EA4335"
                                            />
                                        </svg>
                                    )}
                                    <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                                        {isSigningIn ? "Signing in..." : "Continue with Google"}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-cyber-cyan group-hover:translate-x-1 transition-all duration-300 ml-auto" />
                                </motion.button>

                                {/* Divider */}
                                <div className="flex items-center gap-4 my-6">
                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                                    <span className="text-xs text-gray-600 font-mono">SECURED BY FIREBASE</span>
                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                                </div>

                                {/* Info */}
                                <p className="text-center text-xs text-gray-500 leading-relaxed">
                                    Your privacy is our priority. AI inference runs entirely in your browser.
                                    <br />
                                    No video data is ever uploaded to our servers.
                                </p>
                            </motion.div>

                            {/* Back to home link */}
                            <motion.div
                                className="text-center mt-6"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                            >
                                <a
                                    href="/"
                                    className="text-xs text-gray-500 hover:text-cyber-cyan transition-colors duration-300"
                                >
                                    ← Back to home
                                </a>
                            </motion.div>
                        </motion.div>
                    ) : (
                        /* Role Selection */
                        <motion.div
                            key="role"
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -30, scale: 0.95 }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <motion.div
                                className="text-center mb-8"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <h2 className="text-2xl font-bold text-white mb-2">
                                    Choose your role
                                </h2>
                                <p className="text-gray-400 text-sm">
                                    Welcome, {user?.name}! How will you use ProctorAI?
                                </p>
                            </motion.div>

                            <div className="grid gap-4">
                                {[
                                    {
                                        role: "admin" as UserRole,
                                        icon: Shield,
                                        title: "Admin / Proctor",
                                        description: "Monitor students, manage exams, review incidents, and analyze reports.",
                                        gradient: "from-cyber-indigo to-cyber-violet",
                                        glowColor: "rgba(99, 102, 241, 0.2)",
                                    },
                                    {
                                        role: "student" as UserRole,
                                        icon: Users,
                                        title: "Student",
                                        description: "Take proctored exams with AI-powered behavioral monitoring.",
                                        gradient: "from-cyber-cyan to-emerald-400",
                                        glowColor: "rgba(0, 212, 255, 0.2)",
                                    },
                                ].map((item, i) => (
                                    <motion.button
                                        key={item.role}
                                        onClick={() => handleRoleSelect(item.role)}
                                        disabled={selectedRole !== null}
                                        className="glass-card p-6 text-left group relative overflow-hidden disabled:opacity-50"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + i * 0.15 }}
                                        whileHover={{ scale: 1.02, y: -4 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {/* Hover gradient overlay */}
                                        <div
                                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                                            style={{
                                                background: `radial-gradient(300px circle at 50% 50%, ${item.glowColor}, transparent 70%)`,
                                            }}
                                        />

                                        <div className="relative z-10 flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center flex-shrink-0`}>
                                                <item.icon className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                                                    {item.title}
                                                    {selectedRole === item.role && (
                                                        <motion.div
                                                            className="w-5 h-5 rounded-full border-2 border-transparent border-t-white"
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                        />
                                                    )}
                                                </h3>
                                                <p className="text-sm text-gray-400 leading-relaxed">
                                                    {item.description}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 mt-1" />
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
