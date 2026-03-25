// ========================================
// ProctorAI — Calibration Module
// 30-second calibration to establish baselines
// ========================================

import type { CalibrationData, SignalReading } from "@/types";
import { eventBus, EVENTS } from "./eventBus";
import { detectFace } from "./faceDetection";
import { estimateGaze } from "./gazeEstimation";
import { estimateHeadPose } from "./headPoseEstimation";
import { analyzeAudio } from "./audioAnalysis";

const SAMPLE_INTERVAL = 500; // ms between samples
const MIN_FACE_SAMPLES = 20; // Need at least 20 good face detections to calibrate
const HARD_TIMEOUT = 60_000; // 60s absolute max — prevent infinite stall

interface CalibrationSamples {
    faceBoxes: Array<{ x: number; y: number; width: number; height: number }>;
    gazeDeviations: Array<{ left: { x: number; y: number }; right: { x: number; y: number } }>;
    headPoses: Array<{ yaw: number; pitch: number; roll: number }>;
    audioLevels: number[];
}

export async function runCalibration(
    videoElement: HTMLVideoElement
): Promise<CalibrationData | null> {
    const samples: CalibrationSamples = {
        faceBoxes: [],
        gazeDeviations: [],
        headPoses: [],
        audioLevels: [],
    };

    let elapsed = 0;
    let consecutiveMisses = 0;

    return new Promise((resolve) => {
        const sampleInterval = setInterval(async () => {
            elapsed += SAMPLE_INTERVAL;

            // Progress is based on SUCCESSFUL face detections, not time
            const progress = Math.min(1, samples.faceBoxes.length / MIN_FACE_SAMPLES);
            const faceDetected = samples.faceBoxes.length > 0 && consecutiveMisses < 3;

            eventBus.emit(EVENTS.CALIBRATION_PROGRESS, {
                progress,
                elapsed,
                faceDetected,
                samplesCollected: samples.faceBoxes.length,
                samplesNeeded: MIN_FACE_SAMPLES,
            });

            try {
                // Sample face
                const faceReading = await detectFace(videoElement);
                if (faceReading.rawData?.detections && (faceReading.rawData.detections as Array<{box: {x: number; y: number; width: number; height: number}}>).length === 1) {
                    const det = (faceReading.rawData.detections as Array<{box: {x: number; y: number; width: number; height: number}}>)[0];
                    samples.faceBoxes.push(det.box);
                    consecutiveMisses = 0;
                } else {
                    consecutiveMisses++;
                }

                // Sample gaze
                if (faceReading.rawData?.landmarks) {
                    const gazeReading = estimateGaze(
                        faceReading.rawData.landmarks as Array<{ x: number; y: number }>
                    );
                    if (gazeReading.rawData) {
                        samples.gazeDeviations.push({
                            left: gazeReading.rawData.leftIris as { x: number; y: number },
                            right: gazeReading.rawData.rightIris as { x: number; y: number },
                        });
                    }

                    // Sample head pose
                    const headReading = estimateHeadPose(
                        faceReading.rawData.landmarks as Array<{ x: number; y: number }>
                    );
                    if (headReading.rawData) {
                        samples.headPoses.push({
                            yaw: headReading.rawData.yaw as number,
                            pitch: headReading.rawData.pitch as number,
                            roll: headReading.rawData.roll as number,
                        });
                    }
                }

                // Sample audio
                const audioReading = analyzeAudio();
                if (audioReading.rawData) {
                    samples.audioLevels.push(audioReading.rawData.volume as number);
                }
            } catch (error) {
                console.error("[Calibration] Sample error:", error);
                consecutiveMisses++;
            }

            // Complete when enough face samples collected, OR hard timeout reached
            const hasEnoughSamples = samples.faceBoxes.length >= MIN_FACE_SAMPLES;
            const hardTimedOut = elapsed >= HARD_TIMEOUT;

            if (hasEnoughSamples || hardTimedOut) {
                clearInterval(sampleInterval);

                if (hardTimedOut && samples.faceBoxes.length < 5) {
                    console.warn("[Calibration] Timed out with insufficient face data — using defaults");
                }

                // Compute averages
                const calibrationData = computeCalibrationData(samples);
                eventBus.emit(EVENTS.CALIBRATION_COMPLETE, calibrationData);
                resolve(calibrationData);
            }
        }, SAMPLE_INTERVAL);
    });
}

function computeCalibrationData(samples: CalibrationSamples): CalibrationData {
    // Average face box
    const avgFace = samples.faceBoxes.length > 0
        ? {
            x: avg(samples.faceBoxes.map((b) => b.x)),
            y: avg(samples.faceBoxes.map((b) => b.y)),
            width: avg(samples.faceBoxes.map((b) => b.width)),
            height: avg(samples.faceBoxes.map((b) => b.height)),
        }
        : { x: 0, y: 0, width: 200, height: 200 };

    // Average gaze
    const avgGaze = samples.gazeDeviations.length > 0
        ? {
            leftPupil: {
                x: avg(samples.gazeDeviations.map((g) => g.left.x)),
                y: avg(samples.gazeDeviations.map((g) => g.left.y)),
            },
            rightPupil: {
                x: avg(samples.gazeDeviations.map((g) => g.right.x)),
                y: avg(samples.gazeDeviations.map((g) => g.right.y)),
            },
        }
        : { leftPupil: { x: 0, y: 0 }, rightPupil: { x: 0, y: 0 } };

    // Average head pose
    const avgHead = samples.headPoses.length > 0
        ? {
            yaw: avg(samples.headPoses.map((h) => h.yaw)),
            pitch: avg(samples.headPoses.map((h) => h.pitch)),
            roll: avg(samples.headPoses.map((h) => h.roll)),
        }
        : { yaw: 0, pitch: 0, roll: 0 };

    // Average ambient noise
    const ambientNoise = samples.audioLevels.length > 0
        ? avg(samples.audioLevels) * 1.3 // Add 30% buffer
        : 0.05;

    return {
        faceBaseline: avgFace,
        gazeBaseline: avgGaze,
        headPoseBaseline: avgHead,
        ambientNoiseLevel: ambientNoise,
        lightingLevel: 1.0, // TODO: derive from face detection confidence
        calibratedAt: Date.now(),
    };
}

function avg(nums: number[]): number {
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}
