// ========================================
// ProctorAI — Signal Fusion Engine
// Combines 5 channels into unified trust score
// ========================================

import type { SignalReading, SignalSnapshot, SignalChannelName, SIGNAL_WEIGHTS, ViolationType, ViolationSeverity } from "@/types";
import { eventBus, EVENTS } from "./eventBus";

const WEIGHTS: Record<SignalChannelName, number> = {
    face: 0.25,
    gaze: 0.25,
    headPose: 0.20,
    audio: 0.15,
    interaction: 0.15,
};

// Sliding window for temporal smoothing (5 seconds at ~2fps = 10 snapshots)
const WINDOW_SIZE = 10;
const scoreHistory: number[] = [];

// Minimum channels that must agree for a violation flag
const MIN_CHANNELS_FOR_FLAG = 2;

// Time thresholds (ms) — ignore brief anomalies
const TIME_THRESHOLDS: Record<string, number> = {
    gaze_away: 2000,
    head_turned: 3000,
    no_face: 5000,
    audio_speech: 3000,
};

// Track sustained anomaly durations
const anomalyTimers: Map<string, number> = new Map();

function getDefaultReading(channel: SignalChannelName): SignalReading {
    return { channel, score: 0, confidence: 0, timestamp: Date.now() };
}

export function fuseSignals(
    signals: Partial<Record<SignalChannelName, SignalReading>>
): SignalSnapshot {
    const timestamp = Date.now();

    // Fill missing channels with defaults
    const face = signals.face || getDefaultReading("face");
    const gaze = signals.gaze || getDefaultReading("gaze");
    const headPose = signals.headPose || getDefaultReading("headPose");
    const audio = signals.audio || getDefaultReading("audio");
    const interaction = signals.interaction || getDefaultReading("interaction");

    // Weighted fusion
    const fusedScore =
        face.score * WEIGHTS.face +
        gaze.score * WEIGHTS.gaze +
        headPose.score * WEIGHTS.headPose +
        audio.score * WEIGHTS.audio +
        interaction.score * WEIGHTS.interaction;

    // Temporal smoothing — sliding window average
    scoreHistory.push(fusedScore);
    if (scoreHistory.length > WINDOW_SIZE) {
        scoreHistory.shift();
    }
    const smoothedScore = scoreHistory.reduce((a, b) => a + b, 0) / scoreHistory.length;

    // Trust score = 100 - (smoothed anomaly * 100)
    const trustScore = Math.max(0, Math.min(100, Math.round((1 - smoothedScore) * 100)));

    const snapshot: SignalSnapshot = {
        face,
        gaze,
        headPose,
        audio,
        interaction,
        fusedScore: smoothedScore,
        trustScore,
        timestamp,
    };

    // Check for violations
    checkForViolations(snapshot);

    eventBus.emit(EVENTS.SIGNAL_SNAPSHOT, snapshot);
    eventBus.emit(EVENTS.TRUST_UPDATE, { trustScore, fusedScore: smoothedScore, timestamp });

    return snapshot;
}

function checkForViolations(snapshot: SignalSnapshot): void {
    const now = snapshot.timestamp;
    const flaggedChannels: SignalChannelName[] = [];
    const scores: Record<string, number> = {};

    // Threshold per channel — above this = "anomalous"
    const thresholds: Record<SignalChannelName, number> = {
        face: 0.5,
        gaze: 0.55,
        headPose: 0.5,
        audio: 0.4,
        interaction: 0.3,
    };

    // Check each channel
    const channels: Array<{ name: SignalChannelName; reading: SignalReading }> = [
        { name: "face", reading: snapshot.face },
        { name: "gaze", reading: snapshot.gaze },
        { name: "headPose", reading: snapshot.headPose },
        { name: "audio", reading: snapshot.audio },
        { name: "interaction", reading: snapshot.interaction },
    ];

    for (const ch of channels) {
        scores[ch.name] = ch.reading.score;
        if (ch.reading.score >= thresholds[ch.name] && ch.reading.confidence > 0.3) {
            flaggedChannels.push(ch.name);
        }
    }

    // Multi-signal correlation: need at least MIN_CHANNELS_FOR_FLAG channels
    if (flaggedChannels.length >= MIN_CHANNELS_FOR_FLAG) {
        // Determine violation type from highest scoring channel
        const violationType = determineViolationType(snapshot, flaggedChannels);
        const severity = determineSeverity(snapshot.fusedScore, flaggedChannels.length);

        // Check time threshold (sustained anomaly check)
        const timerKey = violationType;
        const threshold = TIME_THRESHOLDS[timerKey] || 2000;

        if (!anomalyTimers.has(timerKey)) {
            anomalyTimers.set(timerKey, now);
        }

        const duration = now - (anomalyTimers.get(timerKey) || now);

        if (duration >= threshold) {
            // Sustained anomaly — emit violation
            eventBus.emit(EVENTS.VIOLATION_DETECTED, {
                type: violationType,
                severity,
                channels: flaggedChannels,
                scores,
                timestamp: now,
                duration,
                description: generateDescription(violationType, flaggedChannels, scores),
            });

            // Reset timer for this type
            anomalyTimers.delete(timerKey);
        }
    } else {
        // No multi-signal agreement — clear all timers
        anomalyTimers.clear();
    }
}

function determineViolationType(
    snapshot: SignalSnapshot,
    flagged: SignalChannelName[]
): ViolationType {
    const face = snapshot.face;
    const interaction = snapshot.interaction;

    // Priority-based determination
    if (face.score >= 0.9 && face.rawData?.faceCount === 0) return "no_face";
    if (face.score >= 0.7 && (face.rawData?.faceCount as number) > 1) return "multiple_faces";
    if (flagged.includes("interaction") && interaction.rawData?.isHidden) return "tab_switch";
    if (flagged.includes("interaction") && (interaction.rawData?.clipboardUseCount as number) > 0) return "clipboard_use";
    if (flagged.includes("audio") && snapshot.audio.score > 0.5) return "audio_speech";
    if (flagged.includes("gaze")) return "gaze_away";
    if (flagged.includes("headPose")) return "head_turned";
    if (flagged.includes("interaction") && (interaction.rawData?.idleTime as number) > 30000) return "idle_timeout";
    return "gaze_away"; // fallback
}

function determineSeverity(fusedScore: number, channelCount: number): ViolationSeverity {
    if (fusedScore >= 0.8 || channelCount >= 4) return "critical";
    if (fusedScore >= 0.6 || channelCount >= 3) return "high";
    if (fusedScore >= 0.4) return "medium";
    if (fusedScore >= 0.2) return "low";
    return "info";
}

function generateDescription(
    type: ViolationType,
    channels: SignalChannelName[],
    scores: Record<string, number>
): string {
    const channelStr = channels.join(", ");
    const topScore = Math.max(...Object.values(scores)).toFixed(2);

    const descriptions: Record<ViolationType, string> = {
        no_face: "No face detected in the frame",
        multiple_faces: "Multiple faces detected in the frame",
        gaze_away: "Student appears to be looking away from the screen",
        head_turned: "Significant head rotation detected",
        audio_speech: "Speech detected during the exam",
        audio_noise: "Unusual audio activity detected",
        tab_switch: "Student switched away from the exam tab",
        clipboard_use: "Clipboard activity (copy/paste) detected",
        idle_timeout: "No user activity detected for extended period",
        right_click: "Repeated right-click attempts detected",
        window_resize: "Window resize activity detected",
    };

    return `${descriptions[type]}. Flagged by ${channels.length} channels (${channelStr}). Peak score: ${topScore}.`;
}

export function resetFusion(): void {
    scoreHistory.length = 0;
    anomalyTimers.clear();
}
