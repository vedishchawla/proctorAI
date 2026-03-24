// ========================================
// ProctorAI — Interaction Monitor Channel
// Tracks browser-level behaviors: tab switches, clipboard, idle, etc.
// ========================================

import type { SignalReading, ViolationType } from "@/types";
import { eventBus, EVENTS } from "./eventBus";

interface InteractionState {
    tabSwitchCount: number;
    lastActiveTime: number;
    clipboardUseCount: number;
    rightClickCount: number;
    windowResizeCount: number;
    isDocumentHidden: boolean;
    idleThresholdMs: number;
}

let state: InteractionState = {
    tabSwitchCount: 0,
    lastActiveTime: Date.now(),
    clipboardUseCount: 0,
    rightClickCount: 0,
    windowResizeCount: 0,
    isDocumentHidden: false,
    idleThresholdMs: 30000, // 30s idle = suspicious
};

let listeners: Array<() => void> = [];

export function initInteractionMonitor(): void {
    // Tab visibility
    const onVisibility = () => {
        if (document.hidden) {
            state.tabSwitchCount++;
            state.isDocumentHidden = true;
            eventBus.emit(EVENTS.INTERACTION_SIGNAL, getInteractionReading("tab_switch"));
        } else {
            state.isDocumentHidden = false;
        }
    };

    // Clipboard (copy/paste)
    const onCopy = () => {
        state.clipboardUseCount++;
        state.lastActiveTime = Date.now();
        eventBus.emit(EVENTS.INTERACTION_SIGNAL, getInteractionReading("clipboard_use"));
    };

    const onPaste = () => {
        state.clipboardUseCount++;
        state.lastActiveTime = Date.now();
        eventBus.emit(EVENTS.INTERACTION_SIGNAL, getInteractionReading("clipboard_use"));
    };

    // Right click
    const onContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        state.rightClickCount++;
        state.lastActiveTime = Date.now();
        eventBus.emit(EVENTS.INTERACTION_SIGNAL, getInteractionReading("right_click"));
    };

    // Window resize (potential screen sharing manipulation)
    const onResize = () => {
        state.windowResizeCount++;
        state.lastActiveTime = Date.now();
    };

    // Mouse/keyboard activity — reset idle timer
    const onActivity = () => {
        state.lastActiveTime = Date.now();
    };

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("resize", onResize);
    document.addEventListener("mousemove", onActivity);
    document.addEventListener("keydown", onActivity);

    listeners = [
        () => document.removeEventListener("visibilitychange", onVisibility),
        () => document.removeEventListener("copy", onCopy),
        () => document.removeEventListener("paste", onPaste),
        () => document.removeEventListener("contextmenu", onContextMenu),
        () => window.removeEventListener("resize", onResize),
        () => document.removeEventListener("mousemove", onActivity),
        () => document.removeEventListener("keydown", onActivity),
    ];

    console.log("✅ Interaction monitor initialized");
}

function getInteractionReading(triggerType?: ViolationType): SignalReading {
    const now = Date.now();
    const idleTime = now - state.lastActiveTime;
    const isIdle = idleTime > state.idleThresholdMs;

    // Score calculation
    let score = 0;

    // Tab switches are the strongest signal
    if (state.isDocumentHidden) {
        score = Math.min(1, 0.5 + state.tabSwitchCount * 0.1);
    }

    // Clipboard use
    if (state.clipboardUseCount > 0) {
        score = Math.max(score, Math.min(0.7, state.clipboardUseCount * 0.2));
    }

    // Idle timeout
    if (isIdle) {
        score = Math.max(score, Math.min(0.6, idleTime / 60000));
    }

    // Right click (minor)
    if (state.rightClickCount > 2) {
        score = Math.max(score, 0.3);
    }

    return {
        channel: "interaction",
        score,
        confidence: 0.95, // Browser events are deterministic
        timestamp: now,
        rawData: {
            tabSwitchCount: state.tabSwitchCount,
            clipboardUseCount: state.clipboardUseCount,
            rightClickCount: state.rightClickCount,
            windowResizeCount: state.windowResizeCount,
            idleTime,
            isHidden: state.isDocumentHidden,
            triggerType,
        },
    };
}

export function pollInteraction(): SignalReading {
    const reading = getInteractionReading();
    return reading;
}

export function getInteractionState(): InteractionState {
    return { ...state };
}

export function stopInteractionMonitor(): void {
    listeners.forEach((remove) => remove());
    listeners = [];
    state = {
        tabSwitchCount: 0,
        lastActiveTime: Date.now(),
        clipboardUseCount: 0,
        rightClickCount: 0,
        windowResizeCount: 0,
        isDocumentHidden: false,
        idleThresholdMs: 30000,
    };
}
