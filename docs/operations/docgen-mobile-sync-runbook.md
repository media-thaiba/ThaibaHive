# Mobile Academic Timetable & Push Synchronization Runbook

## Overview
DOC-GEN integrates with Flutter mobile clients using Riverpod offline caches and FCM push notifications.

## Sync Flow
1. **Device Registration**: Client registers FCM device token via `POST /api/docgen/mobile/tokens`.
2. **Push Event**: When a teacher substitution is assigned or an exam hall ticket is released, `AcademicPushDispatcher` broadcasts a push alert.
3. **Delta Sync**: Client polls `GET /api/docgen/mobile/sync?lastSyncTimestamp=<T0>` to fetch only updated timetable slots.
4. **Offline Cache**: Slots are stored locally using `ScheduleCacheService`, enabling full offline timetable viewing.
