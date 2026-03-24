// ========================================
// ProctorAI — Pipeline Orchestrator
// Coordinates all 5 channels into a unified analysis loop
// ========================================

import type { CalibrationData, SignalSnapshot, SignalChannelName, SignalReading } from "@/types";
import { loadFaceModels, detectFace } from "./faceDetection";
import { estimateGaze } from "./gazeEstimation";
import { estimateHeadPose } from "./headPoseEstimation";
import { initAudioAnalysis, analyzeAudio, stopAudioAnalysis } from "./audioAnalysis";
import { initInteractionMonitor, pollInteraction, stopInteractionMonitor } from "./interactionMonitor";
import { fuseSignals, resetFusion } from "./signalFusion";
import { runCalibration } from "./calibration";
import { eventBus, EVENTS } from "./eventBus";

const ANALYSIS_INTERVAL = 500; // 2 fps — balance between accuracy and performance

export interface PipelineConfig {
    videoElement: HTMLVideoElement;
    mediaStream: MediaStream;
    onSnapshot?: (snapshot: SignalSnapshot) => void;
    onViolation?: (violation: unknown) => void;
    onTrustUpdate?: (data: { trustScore: number }) => void;
    onCalibrationProgress?: (data: { progress: number }) => void;
}

let analysisInterval: ReturnType<typeof setInterval> | null = null;
let calibrationData: CalibrationData | null = null;
let isRunning = false;

export async function initPipeline(config: PipelineConfig): Promise<boolean> {
    let componentsReady = 0;

    try {
        // 1. Load face-api.js models (most likely to fail on some devices)
        eventBus.emit(EVENTS.PIPELINE_START, { phase: "models" });
        await loadFaceModels();
        componentsReady++;
    } catch (error) {
        console.warn("⚠️ Face models failed to load - continuing without video AI:", error);
    }

    try {
        // 2. Init audio analysis
        const audioReady = initAudioAnalysis(config.mediaStream);
        if (audioReady) {
            componentsReady++;
        } else {
            console.warn("⚠️ Audio analysis unavailable - continuing without it");
        }
    } catch (error) {
        console.warn("⚠️ Audio analysis threw an error:", error);
    }

    try {
        // 3. Init interaction monitor
        initInteractionMonitor();
        componentsReady++;
    } catch (error) {
        console.warn("⚠️ Interaction monitor failed to init:", error);
    }

    // 4. Set up event listeners
    if (config.onSnapshot) {
        eventBus.on(EVENTS.SIGNAL_SNAPSHOT, config.onSnapshot as (data: unknown) => void);
    }
    if (config.onViolation) {
        eventBus.on(EVENTS.VIOLATION_DETECTED, config.onViolation);
    }
    if (config.onTrustUpdate) {
        eventBus.on(EVENTS.TRUST_UPDATE, config.onTrustUpdate as (data: unknown) => void);
    }
    if (config.onCalibrationProgress) {
        eventBus.on(EVENTS.CALIBRATION_PROGRESS, config.onCalibrationProgress as (data: unknown) => void);
    }

    if (componentsReady > 0) {
        console.log(`✅ Pipeline initialized gracefully (${componentsReady}/3 channels active)`);
        return true;
    } else {
        console.error("❌ All AI pipeline components failed to initialize. Falling back.");
        return false;
    }
}

export async function startCalibration(videoElement: HTMLVideoElement): Promise<CalibrationData | null> {
    eventBus.emit(EVENTS.CALIBRATION_START, {});
    calibrationData = await runCalibration(videoElement);
    return calibrationData;
}

export function startAnalysis(videoElement: HTMLVideoElement): void {
    if (isRunning) return;
    isRunning = true;

    analysisInterval = setInterval(async () => {
        if (!isRunning) return;

        try {
            // Run all channels in parallel
            const [faceReading] = await Promise.all([
                detectFace(videoElement),
            ]);

            // Gaze and head pose depend on face landmarks
            const landmarks = faceReading.rawData?.landmarks as Array<{ x: number; y: number }> | undefined;
            const gazeReading = estimateGaze(landmarks, calibrationData || undefined);
            const headReading = estimateHeadPose(landmarks, calibrationData || undefined);
            const audioReading = analyzeAudio(calibrationData || undefined);
            const interactionReading = pollInteraction();

            // Fuse all signals
            const signals: Partial<Record<SignalChannelName, SignalReading>> = {
                face: faceReading,
                gaze: gazeReading,
                headPose: headReading,
                audio: audioReading,
                interaction: interactionReading,
            };

            fuseSignals(signals);
        } catch (error) {
            console.error("[Pipeline] Analysis error:", error);
        }
    }, ANALYSIS_INTERVAL);

    console.log("🔴 Analysis loop started (2 fps)");
}

export function stopPipeline(): void {
    isRunning = false;

    if (analysisInterval) {
        clearInterval(analysisInterval);
        analysisInterval = null;
    }

    stopAudioAnalysis();
    stopInteractionMonitor();
    resetFusion();
    eventBus.clear();
    calibrationData = null;

    console.log("⏹ Pipeline stopped");
}

export function getCalibrationData(): CalibrationData | null {
    return calibrationData;
}

export function isPipelineRunning(): boolean {
    return isRunning;
}
