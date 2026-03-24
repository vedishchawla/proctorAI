// ========================================
// ProctorAI — Audio Analysis Channel
// Uses Web Audio API for speech/noise detection
// ========================================

import type { SignalReading, CalibrationData } from "@/types";
import { eventBus, EVENTS } from "./eventBus";

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array | null = null;
let isRunning = false;

export function initAudioAnalysis(stream: MediaStream): boolean {
    try {
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.8;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        dataArray = new Uint8Array(analyser.frequencyBinCount);
        isRunning = true;
        console.log("✅ Audio analysis initialized");
        return true;
    } catch (error) {
        console.error("❌ Audio analysis init failed:", error);
        return false;
    }
}

export function analyzeAudio(calibration?: CalibrationData): SignalReading {
    const timestamp = Date.now();

    if (!isRunning || !analyser || !dataArray) {
        return {
            channel: "audio",
            score: 0,
            confidence: 0,
            timestamp,
        };
    }

    try {
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);

        // Overall volume (RMS)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const volume = rms / 128; // Normalize to 0-1 range

        // Speech frequency band analysis (300Hz - 3400Hz human speech)
        const sampleRate = audioContext!.sampleRate;
        const binSize = sampleRate / analyser.fftSize;
        const speechStart = Math.floor(300 / binSize);
        const speechEnd = Math.min(Math.floor(3400 / binSize), dataArray.length);

        let speechEnergy = 0;
        let totalEnergy = 0;
        for (let i = 0; i < dataArray.length; i++) {
            totalEnergy += dataArray[i];
            if (i >= speechStart && i <= speechEnd) {
                speechEnergy += dataArray[i];
            }
        }

        const speechRatio = totalEnergy > 0 ? speechEnergy / totalEnergy : 0;

        // Ambient noise baseline from calibration
        const ambientLevel = calibration?.ambientNoiseLevel || 0.05;
        const adjustedVolume = Math.max(0, volume - ambientLevel);

        // Score: loud + speech-like = suspicious
        let score = 0;
        if (adjustedVolume > 0.15 && speechRatio > 0.4) {
            // Likely speech
            score = Math.min(1, adjustedVolume * 2);
        } else if (adjustedVolume > 0.3) {
            // Loud noise (could be anything)
            score = Math.min(0.6, adjustedVolume);
        } else {
            // Normal/quiet
            score = 0;
        }

        const reading: SignalReading = {
            channel: "audio",
            score,
            confidence: 0.7,
            timestamp,
            rawData: {
                volume,
                rms,
                speechRatio,
                adjustedVolume,
                ambientLevel,
                frequencyData: Array.from(dataArray.slice(0, 20)),
            },
        };

        eventBus.emit(EVENTS.AUDIO_SIGNAL, reading);
        return reading;
    } catch (error) {
        console.error("[AudioAnalysis] Error:", error);
        return {
            channel: "audio",
            score: 0,
            confidence: 0.3,
            timestamp,
        };
    }
}

export function getFrequencyData(): Uint8Array | null {
    if (!analyser || !dataArray) return null;
    analyser.getByteFrequencyData(dataArray);
    return dataArray;
}

export function stopAudioAnalysis() {
    isRunning = false;
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    analyser = null;
    dataArray = null;
}
