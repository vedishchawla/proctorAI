"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Shield, Sliders, Server, Database, Check, RefreshCw, Cpu, Radio, Sparkles } from "lucide-react";

export default function SettingsDashboardPage() {
    const [calibrationDuration, setCalibrationDuration] = useState(30);
    const [tabSwitchLimit, setTabSwitchLimit] = useState(3);
    const [saved, setSaved] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [seedMessage, setSeedMessage] = useState("");

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleSeedData = async () => {
        setSeeding(true);
        setSeedMessage("");
        try {
            const res = await fetch("/api/seed", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                setSeedMessage("Database successfully seeded with demo exams!");
            } else {
                setSeedMessage(data.error || "Failed to seed database.");
            }
        } catch {
            setSeedMessage("Network error triggering seed API.");
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-hacker-green" />
                    Proctoring System Settings
                </h1>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                    Configure multi-channel fusion weights, tolerance thresholds, and system connections
                </p>
            </div>

            {/* AI Channel Weights Configuration (Fixed Architectural Weights) */}
            <div className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-subtle pb-3">
                    <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-hacker-green" />
                        <h2 className="text-sm font-display font-semibold text-white">
                            5-Channel Behavioral Fusion Weights
                        </h2>
                    </div>
                    <span className="font-mono text-[10px] text-gray-500 bg-surface-2 px-2 py-0.5 rounded border border-subtle">
                        Total Sum: 1.00
                    </span>
                </div>

                <p className="text-xs text-gray-400 font-mono">
                    Weights assigned in the <code className="text-hacker-green">signalFusion.ts</code> engine to determine overall composite trust score.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-surface-2/60 border border-subtle">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400">FACE_DETECT</span>
                            <span className="text-hacker-green font-bold">25% (0.25)</span>
                        </div>
                        <p className="text-[10px] text-gray-600">SSD MobileNet v1 face presence & count</p>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-2/60 border border-subtle">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400">GAZE_TRACK</span>
                            <span className="text-hacker-green font-bold">25% (0.25)</span>
                        </div>
                        <p className="text-[10px] text-gray-600">68-point eye landmark iris deviation</p>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-2/60 border border-subtle">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400">HEAD_POSE</span>
                            <span className="text-hacker-green font-bold">20% (0.20)</span>
                        </div>
                        <p className="text-[10px] text-gray-600">Yaw, Pitch, Roll Euler rotation angles</p>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-2/60 border border-subtle">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400">AUDIO_FFT</span>
                            <span className="text-hacker-green font-bold">15% (0.15)</span>
                        </div>
                        <p className="text-[10px] text-gray-600">300Hz-3400Hz speech frequency band</p>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-2/60 border border-subtle">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400">INPUT_MON</span>
                            <span className="text-hacker-green font-bold">15% (0.15)</span>
                        </div>
                        <p className="text-[10px] text-gray-600">Page visibility, clipboard & idle timers</p>
                    </div>

                    <div className="p-3 rounded-lg bg-hacker-green/[0.04] border border-hacker-green/20 flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 text-hacker-green text-[11px] font-bold">
                            <Shield className="w-3.5 h-3.5" />
                            Multi-Signal Defense
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                            Single channel anomalies below time thresholds do not fire flags.
                        </p>
                    </div>
                </div>
            </div>

            {/* Threshold & Tolerance Controls */}
            <div className="glass-card p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-subtle pb-3">
                    <Sliders className="w-4 h-4 text-hacker-green" />
                    <h2 className="text-sm font-display font-semibold text-white">Exam Integrity Thresholds</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                    <div className="space-y-1.5">
                        <label className="text-gray-400">Baseline Calibration Duration (Seconds)</label>
                        <input
                            type="number"
                            min={10}
                            max={60}
                            value={calibrationDuration}
                            onChange={(e) => setCalibrationDuration(Number(e.target.value))}
                            className="w-full bg-surface-2 border border-subtle rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-hacker-green/50"
                        />
                        <p className="text-[10px] text-gray-600">Sampling time needed to establish lighting & pose baselines</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-gray-400">Tab Switch Tolerance Limit</label>
                        <input
                            type="number"
                            min={1}
                            max={10}
                            value={tabSwitchLimit}
                            onChange={(e) => setTabSwitchLimit(Number(e.target.value))}
                            className="w-full bg-surface-2 border border-subtle rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-hacker-green/50"
                        />
                        <p className="text-[10px] text-gray-600">Number of allowed window blur events before severe warning</p>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-mono font-bold text-black bg-hacker-green hover:shadow-glow-green transition-all"
                    >
                        {saved ? (
                            <>
                                <Check className="w-4 h-4" />
                                Preferences Saved!
                            </>
                        ) : (
                            "Save Thresholds"
                        )}
                    </button>
                </div>
            </div>

            {/* System Status & Diagnostics */}
            <div className="glass-card p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-subtle pb-3">
                    <Server className="w-4 h-4 text-hacker-green" />
                    <h2 className="text-sm font-display font-semibold text-white">System Diagnostics & Architecture</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-surface-2/60 border border-subtle space-y-1">
                        <div className="flex items-center gap-2 text-white">
                            <Database className="w-3.5 h-3.5 text-hacker-green" />
                            <span>MongoDB Atlas</span>
                        </div>
                        <p className="text-[10px] text-hacker-green font-bold">CONNECTED</p>
                        <p className="text-[9px] text-gray-600">Users, Exams, Sessions, Violations</p>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-2/60 border border-subtle space-y-1">
                        <div className="flex items-center gap-2 text-white">
                            <Radio className="w-3.5 h-3.5 text-hacker-green" />
                            <span>Socket.IO Server</span>
                        </div>
                        <p className="text-[10px] text-hacker-green font-bold">PORT 3002</p>
                        <p className="text-[9px] text-gray-600">Real-time bi-directional streaming</p>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-2/60 border border-subtle space-y-1">
                        <div className="flex items-center gap-2 text-white">
                            <Cpu className="w-3.5 h-3.5 text-hacker-green" />
                            <span>In-Browser AI</span>
                        </div>
                        <p className="text-[10px] text-hacker-green font-bold">TF.JS + FACE-API</p>
                        <p className="text-[9px] text-gray-600">Zero cloud video transfer</p>
                    </div>
                </div>

                {/* Seed Data Utility */}
                <div className="pt-2 border-t border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-mono font-medium text-white flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-hacker-green" />
                            Quick Setup: Database Seeding
                        </p>
                        <p className="text-[10px] font-mono text-gray-500">
                            Populates MongoDB with pre-configured Computer Science MCQ & Coding exams
                        </p>
                    </div>

                    <button
                        onClick={handleSeedData}
                        disabled={seeding}
                        className="px-4 py-2 rounded-lg text-xs font-mono border border-subtle hover:border-glow text-gray-300 hover:text-white transition-all flex items-center gap-2 self-start sm:self-auto"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${seeding ? "animate-spin text-hacker-green" : ""}`} />
                        {seeding ? "Seeding..." : "Seed Demo Exams"}
                    </button>
                </div>

                {seedMessage && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs font-mono text-hacker-green bg-hacker-green/10 border border-hacker-green/20 p-2.5 rounded-lg"
                    >
                        ✓ {seedMessage}
                    </motion.p>
                )}
            </div>
        </div>
    );
}

