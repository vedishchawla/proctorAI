"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

// ── Code Rain Background ─────────────────────────────
function CodeRain() {
    const chars = "アイウエオカキクケコサシスセソ01$>_{}[]<>/\\|#%&@!PROCTORAI";
    const columns = 30;
    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-[0.04]">
            {Array.from({ length: columns }).map((_, i) => (
                <div
                    key={i}
                    className="absolute top-0 text-hacker-green font-mono text-xs leading-tight"
                    style={{
                        left: `${(i / columns) * 100}%`,
                        animation: `codeRain ${8 + Math.random() * 12}s linear infinite`,
                        animationDelay: `${-Math.random() * 15}s`,
                    }}
                >
                    {Array.from({ length: 30 }).map((_, j) => (
                        <div key={j}>{chars[Math.floor(Math.random() * chars.length)]}</div>
                    ))}
                </div>
            ))}
        </div>
    );
}

// ── Typing Effect Hook ──────────────────────────────
function useTyping(text: string, speed = 40, delay = 0) {
    const [displayed, setDisplayed] = useState("");
    const [done, setDone] = useState(false);
    useEffect(() => {
        const timeout = setTimeout(() => {
            let i = 0;
            const interval = setInterval(() => {
                setDisplayed(text.slice(0, i + 1));
                i++;
                if (i >= text.length) {
                    clearInterval(interval);
                    setDone(true);
                }
            }, speed);
            return () => clearInterval(interval);
        }, delay);
        return () => clearTimeout(timeout);
    }, [text, speed, delay]);
    return { displayed, done };
}

// ── Scroll Reveal ────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisible(true); },
            { threshold: 0.15 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);
    return (
        <motion.div
            ref={ref}
            className={className}
            initial={{ opacity: 0, y: 40 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
}

// ── Section 1: HERO ──────────────────────────────────
function HeroSection() {
    const line1 = useTyping("Initializing ProctorAI v2.0...", 35, 500);
    const line2 = useTyping("Loading 5-channel behavioral analysis pipeline", 30, 2200);
    const line3 = useTyping("System ready. All monitors active.", 35, 4500);
    const [showMain, setShowMain] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setShowMain(true), 5800);
        return () => clearTimeout(t);
    }, []);

    return (
        <section className="relative min-h-screen flex flex-col justify-center px-6 md:px-16 lg:px-24 overflow-hidden">
            {/* Grid bg */}
            <div className="absolute inset-0 dot-grid z-0" />

            {/* Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-hacker-green/[0.03] to-transparent blur-3xl z-0" />

            {/* Terminal boot sequence */}
            <div className="relative z-10 max-w-3xl">
                <div className="font-mono text-xs text-hacker-green/60 mb-8 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-hacker-green/30">$</span>
                        <span>{line1.displayed}</span>
                        {!line1.done && <span className="terminal-cursor terminal-cursor-sm" />}
                    </div>
                    {line1.done && (
                        <div className="flex items-center gap-2">
                            <span className="text-hacker-green/30">$</span>
                            <span>{line2.displayed}</span>
                            {!line2.done && <span className="terminal-cursor terminal-cursor-sm" />}
                        </div>
                    )}
                    {line2.done && (
                        <div className="flex items-center gap-2">
                            <span className="text-hacker-green">✓</span>
                            <span className="text-hacker-green">{line3.displayed}</span>
                            {!line3.done && <span className="terminal-cursor terminal-cursor-sm" />}
                        </div>
                    )}
                </div>

                {showMain && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="flex items-center gap-2 mb-6">
                            <div className="status-dot live" />
                            <span className="section-label">Exam Surveillance System</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-display font-bold tracking-tight leading-[0.9] mb-6">
                            <span className="text-white">We see</span>
                            <br />
                            <span className="gradient-text glow-green">everything.</span>
                        </h1>

                        <p className="text-base md:text-lg text-gray-500 max-w-lg leading-relaxed font-light mb-10">
                            5-channel AI that watches eyes, face, voice, and behavior — 
                            all running in your browser. No cloud uploads. No lockdowns. Just truth.
                        </p>

                        <div className="flex flex-wrap items-center gap-4">
                            <a href="/login" className="gradient-btn px-7 py-3 rounded-lg">
                                Launch System →
                            </a>
                            <a href="#story" className="px-7 py-3 rounded-lg text-sm font-mono text-gray-500 border border-subtle hover:border-glow hover:text-hacker-green transition-all duration-300">
                                scroll to explore
                            </a>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Floating HUD elements */}
            {showMain && (
                <motion.div
                    className="absolute right-12 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-3"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                >
                    {[
                        { label: "FACE", status: "active", score: "0.98" },
                        { label: "GAZE", status: "active", score: "0.95" },
                        { label: "HEAD", status: "active", score: "0.97" },
                        { label: "AUDIO", status: "active", score: "0.92" },
                        { label: "INPUT", status: "active", score: "1.00" },
                    ].map((ch, i) => (
                        <motion.div
                            key={ch.label}
                            className="flex items-center gap-3 px-4 py-2 rounded-lg border border-subtle bg-surface-1/50 font-mono text-[11px]"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + i * 0.1 }}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-hacker-green shadow-glow-green" />
                            <span className="text-gray-500 w-12">{ch.label}</span>
                            <span className="text-hacker-green">{ch.score}</span>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Scroll indicator */}
            {showMain && (
                <motion.div
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] text-gray-600"
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                >
                    ↓ scroll
                </motion.div>
            )}
        </section>
    );
}

// ── Section 2: THE STORY ─────────────────────────────
function StorySection() {
    return (
        <section id="story" className="py-32 px-6 md:px-16 lg:px-24 relative">
            <div className="divider-glow mb-24" />
            <div className="max-w-3xl mx-auto">
                <Reveal>
                    <span className="section-label">// the origin</span>
                </Reveal>

                <Reveal delay={0.1}>
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mt-4 mb-8 leading-tight">
                        I watched my peers cheat<br />
                        <span className="text-gray-500">during a HackerRank round.</span>
                    </h2>
                </Reveal>

                <Reveal delay={0.2}>
                    <div className="space-y-6 text-gray-400 text-base leading-relaxed">
                        <p>
                            Coding interview. Online. Proctored — supposedly. Half the room had phones under their desks. 
                            Some shared screens on Discord. The &quot;proctoring&quot; caught none of it.
                        </p>
                        <p>
                            The tools companies use? They lock your browser, upload your webcam to some cloud, and flag you 
                            for <span className="text-white font-medium">sneezing</span>. Meanwhile, actual cheaters walk right through.
                        </p>
                    </div>
                </Reveal>

                {/* Problem cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-12">
                    {[
                        { stat: "72%", desc: "of students admit to cheating in online exams", icon: "⚠" },
                        { stat: "43%", desc: "false positive rate in existing proctoring tools", icon: "✕" },
                        { stat: "100%", desc: "of video data shipped to cloud servers", icon: "☁" },
                        { stat: "0", desc: "tools that use multimodal signal fusion", icon: "∅" },
                    ].map((item, i) => (
                        <Reveal key={i} delay={0.1 * i}>
                            <div className="glass-card p-5 flex items-start gap-4">
                                <span className="text-2xl">{item.icon}</span>
                                <div>
                                    <p className="text-2xl font-bold gradient-text-warm">{item.stat}</p>
                                    <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>

                <Reveal delay={0.3}>
                    <p className="text-gray-400 mt-12 text-base leading-relaxed">
                        So I built something different. Something that actually <span className="text-hacker-green font-medium glow-green">watches</span>, 
                        actually <span className="text-hacker-green font-medium glow-green">understands</span>, 
                        and doesn&apos;t punish you for being human.
                    </p>
                </Reveal>
            </div>
        </section>
    );
}

// ── Section 3: THE SYSTEM ─────────────────────────────
function SystemSection() {
    const channels = [
        { name: "FACE_DETECT", weight: "0.25", desc: "SSD MobileNet — no face? multiple faces? we know.", tech: "face-api.js", color: "text-hacker-green" },
        { name: "GAZE_TRACK", weight: "0.25", desc: "68 eye landmarks → pupil vectors. Looking away >2s = flagged.", tech: "landmarks", color: "text-hacker-cyan" },
        { name: "HEAD_POSE", weight: "0.20", desc: "Euler angles from face mesh. Head turned >30° = suspicious.", tech: "3-axis", color: "text-hacker-amber" },
        { name: "AUDIO_FFT", weight: "0.15", desc: "Web Audio API. Speech patterns vs ambient noise. Real-time.", tech: "FFT", color: "text-hacker-rose" },
        { name: "INPUT_MON", weight: "0.15", desc: "Tab switches, clipboard, idle time, right-click. All tracked.", tech: "browser", color: "text-hacker-violet" },
    ];

    return (
        <section className="py-32 px-6 md:px-16 lg:px-24 relative">
            <div className="divider-glow mb-24" />
            <div className="max-w-5xl mx-auto">
                <Reveal>
                    <span className="section-label">// the system</span>
                </Reveal>
                <Reveal delay={0.1}>
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mt-4 mb-4 leading-tight">
                        5 channels.<br />
                        <span className="text-gray-500">One verdict.</span>
                    </h2>
                </Reveal>
                <Reveal delay={0.15}>
                    <p className="text-gray-500 text-sm mb-16 max-w-xl">
                        Each channel runs independently in your browser. Signals are fused through a weighted 
                        engine with temporal smoothing. A flag requires ≥2 channels to agree.
                    </p>
                </Reveal>

                {/* Channel list — terminal style */}
                <div className="space-y-2">
                    {channels.map((ch, i) => (
                        <Reveal key={ch.name} delay={i * 0.08}>
                            <div className="glass-card p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 group">
                                {/* Index */}
                                <span className="font-mono text-xs text-gray-600 w-6 flex-shrink-0">0{i + 1}</span>
                                
                                {/* Name */}
                                <span className={`font-mono text-sm font-bold ${ch.color} w-32 flex-shrink-0`}>
                                    {ch.name}
                                </span>
                                
                                {/* Description */}
                                <span className="text-xs text-gray-400 flex-1">{ch.desc}</span>
                                
                                {/* Weight */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="font-mono text-[10px] text-gray-600 px-2 py-0.5 rounded border border-subtle">
                                        {ch.tech}
                                    </span>
                                    <span className="font-mono text-sm text-white font-bold">{ch.weight}</span>
                                </div>
                                
                                {/* Status */}
                                <div className="w-1.5 h-1.5 rounded-full bg-hacker-green shadow-glow-green flex-shrink-0" />
                            </div>
                        </Reveal>
                    ))}
                </div>

                {/* Fusion engine */}
                <Reveal delay={0.5}>
                    <div className="mt-8 glass-card p-6 border-hacker-green/10 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-hacker-green/[0.02] to-transparent" />
                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <p className="font-mono text-xs text-hacker-green mb-1">SIGNAL_FUSION_ENGINE</p>
                                <p className="text-xs text-gray-500">
                                    Weighted combination → 5s sliding window → ≥2 channel correlation → flag or ignore
                                </p>
                            </div>
                            <div className="font-mono text-xs text-gray-600 flex items-center gap-2">
                                <span className="text-hacker-green">OUTPUT:</span>
                                <span className="text-white font-bold text-base">trust_score</span>
                                <span className="text-gray-600">(0–100)</span>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

// ── Section 4: DEFENSE ────────────────────────────────
function DefenseSection() {
    return (
        <section className="py-32 px-6 md:px-16 lg:px-24 relative">
            <div className="divider-glow mb-24" />
            <div className="max-w-4xl mx-auto">
                <Reveal>
                    <span className="section-label">// false positive defense</span>
                </Reveal>
                <Reveal delay={0.1}>
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mt-4 mb-4 leading-tight">
                        Sneezing isn&apos;t cheating.<br />
                        <span className="text-gray-500">We know the difference.</span>
                    </h2>
                </Reveal>

                <div className="mt-12 space-y-4">
                    {[
                        {
                            layer: "01",
                            title: "Intelligent Thresholds",
                            desc: "Brief glance away (<2s) → ignored. Leave frame <5s → observation. Only sustained anomalies get flagged.",
                            color: "text-hacker-green",
                            borderColor: "border-hacker-green/10",
                        },
                        {
                            layer: "02",
                            title: "Multi-Signal Correlation",
                            desc: "A flag requires ≥2 channels to agree. Gaze off + tab switch = flag. Gaze off alone = just thinking. This kills false positives.",
                            color: "text-hacker-cyan",
                            borderColor: "border-hacker-cyan/10",
                        },
                        {
                            layer: "03",
                            title: "Human Review Queue",
                            desc: "Every flag goes to admin with a 10s evidence window + all channel scores. Admin can dismiss, confirm, warn, or end exam. Dismissed flags recalibrate.",
                            color: "text-hacker-amber",
                            borderColor: "border-hacker-amber/10",
                        },
                    ].map((item, i) => (
                        <Reveal key={item.layer} delay={i * 0.12}>
                            <div className={`glass-card p-6 ${item.borderColor} flex items-start gap-5`}>
                                <span className={`font-mono text-3xl font-bold ${item.color} opacity-30 flex-shrink-0`}>
                                    {item.layer}
                                </span>
                                <div>
                                    <h3 className={`font-mono text-sm font-bold ${item.color} mb-2`}>{item.title}</h3>
                                    <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>

                {/* Calibration note */}
                <Reveal delay={0.4}>
                    <div className="mt-8 flex items-start gap-3 px-4 py-3 rounded-lg bg-hacker-green/[0.03] border border-hacker-green/10">
                        <span className="text-hacker-green font-mono text-xs font-bold mt-0.5">+</span>
                        <p className="text-xs text-gray-400">
                            <span className="text-hacker-green font-medium">30s calibration</span> before every exam. 
                            Records your baseline face, lighting, and noise level. 
                            Dim room? Adjusted. Noisy environment? Adjusted. No one gets unfairly flagged.
                        </p>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

// ── Section 5: VS COMPETITORS ─────────────────────────
function CompareSection() {
    const features = [
        { feature: "Signal approach", others: "Siloed", ours: "5-channel fusion", win: true },
        { feature: "Browser control", others: "Hard lockdown", ours: "Soft monitoring", win: true },
        { feature: "Privacy", others: "Cloud upload", ours: "Browser-side AI", win: true },
        { feature: "False positive rate", others: "High", ours: "Low (multi-signal)", win: true },
        { feature: "Human review", others: "Manual", ours: "Auto-queued + evidence", win: true },
        { feature: "Bias mitigation", others: "Known issues", ours: "Calibrated per-student", win: true },
    ];

    return (
        <section className="py-32 px-6 md:px-16 lg:px-24 relative">
            <div className="divider-glow mb-24" />
            <div className="max-w-4xl mx-auto">
                <Reveal>
                    <span className="section-label">// vs the market</span>
                </Reveal>
                <Reveal delay={0.1}>
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mt-4 mb-12 leading-tight">
                        They lock. We watch.<br />
                        <span className="text-gray-500">Different philosophy.</span>
                    </h2>
                </Reveal>

                <div className="glass-card overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-3 gap-4 px-4 md:px-6 py-3 border-b border-subtle font-mono text-[10px] text-gray-600 uppercase tracking-wider">
                        <span>Feature</span>
                        <span>Proctorio / ExamSoft</span>
                        <span className="text-hacker-green">ProctorAI</span>
                    </div>
                    {/* Rows */}
                    {features.map((row, i) => (
                        <Reveal key={row.feature} delay={i * 0.06}>
                            <div className="grid grid-cols-3 gap-4 px-4 md:px-6 py-3 border-b border-subtle last:border-b-0 text-xs hover:bg-white/[0.01] transition-colors">
                                <span className="text-gray-300 font-medium">{row.feature}</span>
                                <span className="text-gray-600">{row.others}</span>
                                <span className="text-hacker-green font-mono font-medium">{row.ours}</span>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ── Section 6: CTA ────────────────────────────────────
function CTASection() {
    return (
        <section className="py-32 px-6 md:px-16 lg:px-24 relative">
            <div className="divider-glow mb-24" />
            <div className="max-w-2xl mx-auto text-center">
                <Reveal>
                    <span className="section-label">// get started</span>
                </Reveal>
                <Reveal delay={0.1}>
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mt-4 mb-6 leading-tight">
                        Ready to proctor<br />
                        <span className="gradient-text glow-green">the right way?</span>
                    </h2>
                </Reveal>
                <Reveal delay={0.2}>
                    <p className="text-gray-500 text-sm mb-10 max-w-md mx-auto">
                        Deploy in minutes. No browser extensions. No cloud uploads. 
                        Just a URL and a webcam.
                    </p>
                </Reveal>
                <Reveal delay={0.3}>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a href="/login" className="gradient-btn px-8 py-3.5 rounded-lg">
                            Start Proctoring →
                        </a>
                        <a href="https://github.com" className="px-8 py-3.5 rounded-lg text-sm font-mono text-gray-500 border border-subtle hover:border-glow hover:text-hacker-green transition-all duration-300" target="_blank" rel="noopener">
                            view source ↗
                        </a>
                    </div>
                </Reveal>

                {/* Trust badges */}
                <Reveal delay={0.4}>
                    <div className="flex items-center justify-center gap-6 mt-12 font-mono text-[10px] text-gray-600">
                        <span className="flex items-center gap-1.5"><span className="text-hacker-green">◆</span> Privacy-first</span>
                        <span className="flex items-center gap-1.5"><span className="text-hacker-green">◆</span> Open source</span>
                        <span className="flex items-center gap-1.5"><span className="text-hacker-green">◆</span> Zero cloud upload</span>
                    </div>
                </Reveal>

                {/* Footer */}
                <div className="mt-24 pt-8 border-t border-subtle">
                    <p className="font-mono text-[10px] text-gray-700">
                        Built with Next.js · TensorFlow.js · Firebase · MongoDB · Socket.IO
                    </p>
                    <p className="font-mono text-[10px] text-gray-800 mt-1">
                        ProctorAI © 2026
                    </p>
                </div>
            </div>
        </section>
    );
}

// ── NAVBAR ────────────────────────────────────────────
function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-16 lg:px-24 py-4 transition-all duration-500 ${scrolled ? "glass" : ""}`}>
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-hacker-green/10 border border-hacker-green/20 flex items-center justify-center">
                    <span className="text-hacker-green font-mono text-xs font-bold">P</span>
                </div>
                <span className="text-sm font-mono font-semibold text-white tracking-tight">
                    proctor<span className="text-hacker-green">AI</span>
                </span>
            </div>

            <div className="hidden md:flex items-center gap-6 font-mono text-xs text-gray-600">
                <a href="#story" className="hover:text-hacker-green transition-colors duration-300">story</a>
                <a href="#" className="hover:text-hacker-green transition-colors duration-300">system</a>
                <a href="#" className="hover:text-hacker-green transition-colors duration-300">defense</a>
            </div>

            <a href="/login" className="px-4 py-1.5 rounded-md text-xs font-mono font-bold text-black bg-hacker-green hover:shadow-glow-green transition-all duration-300">
                launch →
            </a>
        </nav>
    );
}

// ══════════════════════════════════════════════════════
// MAIN PAGE — Story-driven scroll experience
// ══════════════════════════════════════════════════════
export default function Home() {
    return (
        <main className="relative">
            <CodeRain />
            <Navbar />
            <HeroSection />
            <StorySection />
            <SystemSection />
            <DefenseSection />
            <CompareSection />
            <CTASection />
        </main>
    );
}
