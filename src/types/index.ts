// ========================================
// ProctorAI — Core Type System
// ========================================

// ----- User -----
export type UserRole = "admin" | "student";

export interface IUser {
    _id?: string;
    firebaseUID: string;
    name: string;
    email: string;
    avatar?: string;
    role: UserRole;
    createdAt?: Date;
    updatedAt?: Date;
}

// ----- Exam -----
export interface IQuestion {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number; // index of correct option
    points: number;
}

export interface IExamSettings {
    webcamRequired: boolean;
    audioRequired: boolean;
    tabSwitchLimit: number;
    autoSubmitOnCritical: boolean;
    calibrationDuration: number; // seconds
}

export interface IExam {
    _id?: string;
    title: string;
    description: string;
    questions: IQuestion[];
    duration: number; // minutes
    settings: IExamSettings;
    createdBy: string; // user ID
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

// ----- Session -----
export type SessionStatus = "calibrating" | "active" | "paused" | "completed" | "terminated";

export interface ISession {
    _id?: string;
    examId: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    startTime: Date;
    endTime?: Date;
    trustScore: number; // 0-100
    status: SessionStatus;
    calibrationData?: CalibrationData;
    answers: Record<string, number>; // questionId -> selectedOption
    totalViolations: number;
    createdAt?: Date;
}

// ----- Violation -----
export type ViolationSeverity = "info" | "low" | "medium" | "high" | "critical";

export type ViolationType =
    | "no_face"
    | "multiple_faces"
    | "gaze_away"
    | "head_turned"
    | "audio_speech"
    | "audio_noise"
    | "tab_switch"
    | "clipboard_use"
    | "idle_timeout"
    | "right_click"
    | "window_resize";

export type AdminAction = "pending" | "dismissed" | "confirmed" | "warned" | "exam_ended";

export interface IViolation {
    _id?: string;
    sessionId: string;
    type: ViolationType;
    severity: ViolationSeverity;
    channels: SignalChannelName[];
    scores: Record<SignalChannelName, number>;
    timestamp: Date;
    duration?: number; // ms
    description: string;
    adminAction: AdminAction;
    adminNote?: string;
    createdAt?: Date;
}

// ----- AI Signal Types -----
export type SignalChannelName = "face" | "gaze" | "headPose" | "audio" | "interaction";

export interface SignalReading {
    channel: SignalChannelName;
    score: number; // 0-1 (0 = normal, 1 = max anomaly)
    confidence: number; // 0-1
    timestamp: number;
    rawData?: Record<string, unknown>;
}

export interface SignalSnapshot {
    face: SignalReading;
    gaze: SignalReading;
    headPose: SignalReading;
    audio: SignalReading;
    interaction: SignalReading;
    fusedScore: number; // 0-1
    trustScore: number; // 0-100
    timestamp: number;
}

// ----- Calibration -----
export interface CalibrationData {
    faceBaseline: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    gazeBaseline: {
        leftPupil: { x: number; y: number };
        rightPupil: { x: number; y: number };
    };
    headPoseBaseline: {
        yaw: number;
        pitch: number;
        roll: number;
    };
    ambientNoiseLevel: number;
    lightingLevel: number;
    calibratedAt: number;
}

// ----- Signal Weights -----
export const SIGNAL_WEIGHTS: Record<SignalChannelName, number> = {
    face: 0.25,
    gaze: 0.25,
    headPose: 0.20,
    audio: 0.15,
    interaction: 0.15,
};

// ----- Socket.IO Events -----
export interface SocketEvents {
    "student:join": { sessionId: string; examId: string; userId: string; userName: string };
    "student:leave": { sessionId: string };
    "signal:update": { sessionId: string; snapshot: SignalSnapshot };
    "violation:create": { sessionId: string; violation: Omit<IViolation, "_id" | "createdAt"> };
    "admin:action": { violationId: string; action: AdminAction; note?: string };
    "trust:broadcast": { sessionId: string; trustScore: number; snapshot: SignalSnapshot };
    "session:update": { sessionId: string; status: SessionStatus; trustScore: number };
    "calibration:complete": { sessionId: string; calibrationData: CalibrationData };
}
