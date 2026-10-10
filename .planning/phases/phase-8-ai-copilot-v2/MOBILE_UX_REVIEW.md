# Mobile & Flutter UX Review: Phase 8 (AI Copilot V2)

**Status**: Completed  
**Review Target**: `.planning/phases/phase-8-ai-copilot-v2/PLAN.md` & `SPEC.md`  
**Reviewer**: Mobile & Real-Time Flutter Architecture Reviewer  
**Classification**: 5 Key Mobile Enhancements Addressed in Draft v2

---

## Key Findings & Resolutions

### 1. Hybrid Voice Architecture & Missing Dependencies
- **Finding**: Ambiguity between on-device STT/TTS vs bidirectional audio streaming over WebSockets; `flutter_tts` and `audio_session` missing from `pubspec.yaml`.
- **Resolution**:
  - Add `flutter_tts: ^4.2.0` and `audio_session: ^0.1.21` to `thaibahive_mobile_app/pubspec.yaml`.
  - Architecture: Hybrid approach. On mobile, use native on-device `speech_to_text` for instant low-bandwidth commands + fallback to WebSocket raw PCM streaming for bidirectional duplex streaming.
  - Implement explicit iOS/Android audio session management (handling interruptions, route changes, ducking background audio).

### 2. Audio Streaming Format & Network Resilience
- **Finding**: WebM audio encoding is unsupported natively in iOS/Flutter; cellular network switches cause unhandled WebSocket drops.
- **Resolution**:
  - Use Linear PCM (16kHz, 16-bit mono) / Opus frame binary payloads instead of WebM on mobile.
  - Implement heartbeat ping/pong (every 5s), sequence numbering (`seqId`), and auto-reconnect backoff with audio buffer flushing on backgrounding.

### 3. Step 4 Offline Document Queue in `SyncCoordinator`
- **Finding**: `SyncCoordinator` only had Steps 1–3 (Offline Queue, Media Drain, Chat Drain), leaving AI document photo uploads unhandled when offline.
- **Resolution**:
  - Add Step 4: `aiDocumentDrainProvider.notifier.drain()` to `SyncCoordinator.syncNow()`.
  - Create Hive box `ai_document_outbox` with `AiDocumentJob` supporting background image compression isolate (downscaling to max 2048px @ 80% JPEG quality) before uploading.

### 4. FCM Push & Deep Linking for HITL Approvals
- **Finding**: Missing explicit deep link mapping for approval gates and no mobile-optimized diff view.
- **Resolution**:
  - Register `/copilot/approvals/:id` in `GoRouter` (`lib/app/router.dart`) and wire foreground/background/cold push tap dispatch in `PushNotificationService`.
  - Build `AiApprovalDetailScreen` featuring vertical diff badges (`oldValue` vs `newValue`) and inline editable fields for "Modify" decisions.

### 5. Mobile Permissions & Manifests
- **Resolution**:
  - Add `<uses-permission android:name="android.permission.RECORD_AUDIO" />` in Android manifest.
  - Add `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` in iOS `Info.plist`.
