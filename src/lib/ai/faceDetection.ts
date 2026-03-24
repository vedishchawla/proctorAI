// ========================================
// ProctorAI — Face Detection Channel
// Uses face-api.js for real-time face detection
// ========================================

import * as faceapi from "face-api.js";
import type { SignalReading } from "@/types";
import { eventBus, EVENTS } from "./eventBus";

let modelsLoaded = false;

export async function loadFaceModels(): Promise<void> {
    if (modelsLoaded) return;
    try {
        const MODEL_URL = "/models";
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        modelsLoaded = true;
        console.log("✅ Face detection models loaded");
    } catch (error) {
        console.error("❌ Failed to load face models:", error);
        throw error;
    }
}

export function isModelsLoaded(): boolean {
    return modelsLoaded;
}

export async function detectFace(
    video: HTMLVideoElement
): Promise<SignalReading> {
    const timestamp = Date.now();

    if (!modelsLoaded) {
        return {
            channel: "face",
            score: 0,
            confidence: 0,
            timestamp,
        };
    }

    try {
        const detections = await faceapi
            .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
            .withFaceLandmarks();

        let score = 0;
        let confidence = 0;

        if (detections.length === 0) {
            // No face detected — high anomaly
            score = 1.0;
            confidence = 0.9;
        } else if (detections.length === 1) {
            // Exactly one face — normal
            score = 0;
            confidence = detections[0].detection.score;
        } else {
            // Multiple faces — suspicious
            score = 0.85;
            confidence = 0.95;
        }

        const reading: SignalReading = {
            channel: "face",
            score,
            confidence,
            timestamp,
            rawData: {
                faceCount: detections.length,
                detections: detections.map((d) => ({
                    score: d.detection.score,
                    box: {
                        x: d.detection.box.x,
                        y: d.detection.box.y,
                        width: d.detection.box.width,
                        height: d.detection.box.height,
                    },
                })),
                landmarks: detections[0]?.landmarks?.positions?.map((p) => ({
                    x: p.x,
                    y: p.y,
                })),
            },
        };

        eventBus.emit(EVENTS.FACE_SIGNAL, reading);
        return reading;
    } catch (error) {
        console.error("[FaceDetection] Error:", error);
        return {
            channel: "face",
            score: 1.0, // Instantly flag if blocked/crashing
            confidence: 0.9,
            timestamp,
        };
    }
}
