// ========================================
// ProctorAI — Head Pose Estimation Channel
// Estimates yaw/pitch/roll from 68-point face landmarks
// ========================================

import type { SignalReading, CalibrationData } from "@/types";
import { eventBus, EVENTS } from "./eventBus";

interface Euler {
    yaw: number;
    pitch: number;
    roll: number;
}

function estimateEulerAngles(landmarks: { x: number; y: number }[]): Euler {
    // Key landmarks: nose tip (30), chin (8), left eye corner (36), right eye corner (45),
    // left mouth corner (48), right mouth corner (54)
    const noseTip = landmarks[30];
    const chin = landmarks[8];
    const leftEye = landmarks[36];
    const rightEye = landmarks[45];
    const leftMouth = landmarks[48];
    const rightMouth = landmarks[54];

    // Face width and height for normalization
    const faceWidth = Math.abs(rightEye.x - leftEye.x);
    const faceHeight = Math.abs(chin.y - ((leftEye.y + rightEye.y) / 2));

    if (faceWidth === 0 || faceHeight === 0) {
        return { yaw: 0, pitch: 0, roll: 0 };
    }

    // Yaw: nose position relative to face center
    const faceCenterX = (leftEye.x + rightEye.x) / 2;
    const noseOffsetX = (noseTip.x - faceCenterX) / faceWidth;
    const yaw = noseOffsetX * 90; // Approximate degrees

    // Pitch: nose position relative to vertical center
    const faceCenterY = (leftEye.y + rightEye.y) / 2;
    const noseMidY = (faceCenterY + chin.y) / 2;
    const noseOffsetY = (noseTip.y - noseMidY) / faceHeight;
    const pitch = noseOffsetY * 80;

    // Roll: angle between eye corners
    const eyeDeltaY = rightEye.y - leftEye.y;
    const eyeDeltaX = rightEye.x - leftEye.x;
    const roll = Math.atan2(eyeDeltaY, eyeDeltaX) * (180 / Math.PI);

    // Also consider mouth symmetry for yaw refinement
    const mouthCenterX = (leftMouth.x + rightMouth.x) / 2;
    const mouthOffset = (mouthCenterX - faceCenterX) / faceWidth;
    const refinedYaw = (yaw + mouthOffset * 45) / 2;

    return { yaw: refinedYaw, pitch, roll };
}

export function estimateHeadPose(
    landmarks: { x: number; y: number }[] | undefined,
    calibration?: CalibrationData
): SignalReading {
    const timestamp = Date.now();

    if (!landmarks || landmarks.length < 68) {
        return {
            channel: "headPose",
            score: 0.5,
            confidence: 0.2,
            timestamp,
        };
    }

    try {
        const euler = estimateEulerAngles(landmarks);

        // Apply calibration baseline
        let baseYaw = 0, basePitch = 0, baseRoll = 0;
        if (calibration?.headPoseBaseline) {
            baseYaw = calibration.headPoseBaseline.yaw;
            basePitch = calibration.headPoseBaseline.pitch;
            baseRoll = calibration.headPoseBaseline.roll;
        }

        const adjustedYaw = Math.abs(euler.yaw - baseYaw);
        const adjustedPitch = Math.abs(euler.pitch - basePitch);
        const adjustedRoll = Math.abs(euler.roll - baseRoll);

        // Thresholds: >30° yaw or >25° pitch = looking away
        const yawScore = Math.min(1, adjustedYaw / 35);
        const pitchScore = Math.min(1, adjustedPitch / 30);
        const rollScore = Math.min(1, adjustedRoll / 25);

        // Weighted combination
        const score = yawScore * 0.5 + pitchScore * 0.3 + rollScore * 0.2;

        const reading: SignalReading = {
            channel: "headPose",
            score: Math.min(1, score),
            confidence: 0.85,
            timestamp,
            rawData: {
                yaw: euler.yaw,
                pitch: euler.pitch,
                roll: euler.roll,
                adjustedYaw,
                adjustedPitch,
                adjustedRoll,
            },
        };

        eventBus.emit(EVENTS.HEAD_POSE_SIGNAL, reading);
        return reading;
    } catch (error) {
        console.error("[HeadPose] Error:", error);
        return {
            channel: "headPose",
            score: 0.3,
            confidence: 0.3,
            timestamp,
        };
    }
}
