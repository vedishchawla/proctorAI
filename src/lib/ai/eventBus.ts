// ========================================
// ProctorAI — Event Bus (PubSub)
// Channel-agnostic communication between AI modules
// ========================================

type EventCallback = (data: unknown) => void;

class EventBus {
    private listeners: Map<string, Set<EventCallback>> = new Map();

    on(event: string, callback: EventCallback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
        return () => this.off(event, callback);
    }

    off(event: string, callback: EventCallback) {
        this.listeners.get(event)?.delete(callback);
    }

    emit(event: string, data?: unknown) {
        this.listeners.get(event)?.forEach((cb) => {
            try {
                cb(data);
            } catch (err) {
                console.error(`[EventBus] Error in listener for "${event}":`, err);
            }
        });
    }

    clear() {
        this.listeners.clear();
    }
}

// Singleton
export const eventBus = new EventBus();

// Event names
export const EVENTS = {
    // Signal readings
    FACE_SIGNAL: "signal:face",
    GAZE_SIGNAL: "signal:gaze",
    HEAD_POSE_SIGNAL: "signal:headPose",
    AUDIO_SIGNAL: "signal:audio",
    INTERACTION_SIGNAL: "signal:interaction",

    // Fused output
    SIGNAL_SNAPSHOT: "signal:snapshot",
    TRUST_UPDATE: "trust:update",
    VIOLATION_DETECTED: "violation:detected",

    // Calibration
    CALIBRATION_START: "calibration:start",
    CALIBRATION_PROGRESS: "calibration:progress",
    CALIBRATION_COMPLETE: "calibration:complete",

    // System
    PIPELINE_START: "pipeline:start",
    PIPELINE_STOP: "pipeline:stop",
    PIPELINE_ERROR: "pipeline:error",
};
