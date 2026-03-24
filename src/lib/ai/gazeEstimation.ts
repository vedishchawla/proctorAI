// ========================================
// ProctorAI — Gaze Estimation Channel
// Uses face landmarks to estimate gaze direction
// ========================================

import type { SignalReading, CalibrationData } from "@/types";
import { eventBus, EVENTS } from "./eventBus";

interface EyePoints {
    leftEye: { x: number; y: number }[];
    rightEye: { x: number; y: number }[];
}

function getEyeCenter(points: { x: number; y: number }[]): { x: number; y: number } {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
}

function getIrisPosition(eyePoints: { x: number; y: number }[]): { x: number; y: number } {
    // Approximate iris from eye corners — use midpoint weighted toward the inner points
    const topMid = {
        x: (eyePoints[1].x + eyePoints[2].x) / 2,
        y: (eyePoints[1].y + eyePoints[2].y) / 2,
    };
    const bottomMid = {
        x: (eyePoints[4].x + eyePoints[5].x) / 2,
        y: (eyePoints[4].y + eyePoints[5].y) / 2,
    };
    return {
        x: (topMid.x + bottomMid.x) / 2,
        y: (topMid.y + bottomMid.y) / 2,
    };
}

export function estimateGaze(
    landmarks: { x: number; y: number }[] | undefined,
    calibration?: CalibrationData
): SignalReading {
    const timestamp = Date.now();

    if (!landmarks || landmarks.length < 68) {
        return {
            channel: "gaze",
            score: 0.5,
            confidence: 0.2,
            timestamp,
        };
    }

    try {
        // Face-api.js 68-point landmark indices:
        // Left eye: 36-41, Right eye: 42-47
        const eyeData: EyePoints = {
            leftEye: landmarks.slice(36, 42),
            rightEye: landmarks.slice(42, 48),
        };

        const leftCenter = getEyeCenter(eyeData.leftEye);
        const rightCenter = getEyeCenter(eyeData.rightEye);
        const leftIris = getIrisPosition(eyeData.leftEye);
        const rightIris = getIrisPosition(eyeData.rightEye);

        // Calculate gaze deviation from eye center
        const leftDeviation = Math.sqrt(
            Math.pow(leftIris.x - leftCenter.x, 2) + Math.pow(leftIris.y - leftCenter.y, 2)
        );
        const rightDeviation = Math.sqrt(
            Math.pow(rightIris.x - rightCenter.x, 2) + Math.pow(rightIris.y - rightCenter.y, 2)
        );

        // Eye width for normalization
        const leftEyeWidth = Math.abs(eyeData.leftEye[3].x - eyeData.leftEye[0].x);
        const rightEyeWidth = Math.abs(eyeData.rightEye[3].x - eyeData.rightEye[0].x);

        // Normalized deviation (0 = centered, 1 = far off)
        const leftNorm = leftEyeWidth > 0 ? leftDeviation / (leftEyeWidth * 0.5) : 0;
        const rightNorm = rightEyeWidth > 0 ? rightDeviation / (rightEyeWidth * 0.5) : 0;
        const avgDeviation = (leftNorm + rightNorm) / 2;

        // Apply calibration baseline if available
        let baselineDeviation = 0;
        if (calibration?.gazeBaseline) {
            const baseLeft = Math.sqrt(
                Math.pow(calibration.gazeBaseline.leftPupil.x, 2) +
                Math.pow(calibration.gazeBaseline.leftPupil.y, 2)
            );
            baselineDeviation = baseLeft * 0.01; // Small correction
        }

        // Score: higher deviation = looking away
        const adjustedDeviation = Math.max(0, avgDeviation - baselineDeviation);
        const score = Math.min(1, adjustedDeviation * 1.5);

        const reading: SignalReading = {
            channel: "gaze",
            score,
            confidence: 0.8,
            timestamp,
            rawData: {
                leftDeviation: leftNorm,
                rightDeviation: rightNorm,
                avgDeviation,
                leftCenter,
                rightCenter,
                leftIris,
                rightIris,
            },
        };

        eventBus.emit(EVENTS.GAZE_SIGNAL, reading);
        return reading;
    } catch (error) {
        console.error("[GazeEstimation] Error:", error);
        return {
            channel: "gaze",
            score: 0.3,
            confidence: 0.3,
            timestamp,
        };
    }
}
