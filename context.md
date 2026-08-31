# ProctorAI — Interview Prep Deep Dive

## Goal
Explain the entire ProctorAI codebase file by file so Vedish can defend it in an offline interview (no laptop, verbal only).

## Resume Claims to Defend
1. **"5-channel behavioral analysis"** — face detection, gaze tracking, head pose, audio FFT, browser interaction
2. **"client-side via TensorFlow.js"** — all AI runs in browser, no server-side processing
3. **"signal fusion engine using weighted sliding windows"** — combining signals with per-student calibration
4. **"real-time admin dashboard with live trust score streaming via Socket.IO"**

---

## Project Architecture

```
ProctorAI/
├── server.js                    # Socket.IO server (Node.js) — real-time student↔admin
├── src/
│   ├── lib/ai/                  # 🧠 CORE AI — the 5 channels + fusion
│   │   ├── faceDetection.ts     # Channel 1: Face count (0, 1, multiple)
│   │   ├── gazeEstimation.ts    # Channel 2: Where user is looking
│   │   ├── headPoseEstimation.ts# Channel 3: Head orientation (yaw/pitch/roll)
│   │   ├── audioAnalysis.ts     # Channel 4: Audio FFT analysis
│   │   ├── interactionMonitor.ts# Channel 5: Browser events (copy/paste/tab switch)
│   │   ├── signalFusion.ts      # 🔥 THE FUSION ENGINE — combines all 5 signals
│   │   ├── pipeline.ts          # Orchestrates the detection loop
│   │   ├── calibration.ts       # Per-student baseline calibration
│   │   └── eventBus.ts          # Pub/sub for inter-module communication
│   ├── lib/
│   │   ├── socket.ts            # Socket.IO client
│   │   ├── firebase.ts          # Firebase config
│   │   ├── auth.tsx             # Auth context (Firebase)
│   │   └── mongodb.ts           # MongoDB connection
│   ├── components/
│   │   ├── ProctorOverlay.tsx   # Main proctoring UI overlay
│   │   └── CodeEditor.tsx       # Monaco code editor
│   ├── models/                  # Mongoose schemas
│   │   ├── Exam.ts, Session.ts, User.ts, Violation.ts
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── login/page.tsx       # Login
│   │   ├── exam/[id]/page.tsx   # Student exam page (where proctoring runs)
│   │   ├── dashboard/page.tsx   # Admin dashboard
│   │   └── api/                 # Next.js API routes (REST)
│   └── types/index.ts           # TypeScript types
```

---

## Study Plan (file by file, feature by feature)

### Phase 1: Core AI Engine (most important for interview)
- [/] `types/index.ts` — understand the data types first
- [ ] `eventBus.ts` — how modules communicate
- [ ] `faceDetection.ts` — Channel 1 ✅ (already read)
- [ ] `gazeEstimation.ts` — Channel 2
- [ ] `headPoseEstimation.ts` — Channel 3
- [ ] `audioAnalysis.ts` — Channel 4
- [ ] `interactionMonitor.ts` — Channel 5
- [ ] `signalFusion.ts` — THE key file (fusion engine)
- [ ] `calibration.ts` — per-student baselines
- [ ] `pipeline.ts` — how detection loop runs

### Phase 2: Real-time Communication
- [ ] `server.js` ✅ (already read)
- [ ] `socket.ts` — client-side socket
- [ ] `ProctorOverlay.tsx` — how UI ties it all together

### Phase 3: Backend & Data
- [ ] `models/` — Exam, Session, Violation, User schemas
- [ ] `api/` routes — REST endpoints
- [ ] `mongodb.ts`, `firebase.ts`, `auth.tsx`

### Phase 4: Pages & Flow
- [ ] `exam/[id]/page.tsx` — student exam flow
- [ ] `dashboard/page.tsx` — admin view

---

## Progress Tracker
- **Current Phase:** Phase 1
- **Current File:** Starting with types/index.ts
- **Files Completed:** server.js, faceDetection.ts (partial)
