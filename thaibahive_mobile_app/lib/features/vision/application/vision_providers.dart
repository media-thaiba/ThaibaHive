// Flutter State Models & Riverpod Providers for SafeCampus OS & Vision Shield (VISION-022)

import 'package:flutter_riverpod/flutter_riverpod.dart';

class CampusSafetyStatus {
  final String safetyLevel; // 'normal', 'elevated', 'lockdown'
  final int activeIncidentsCount;
  final int guardsOnDuty;
  final bool isLockdownActive;
  final String lastAuditTimestamp;

  const CampusSafetyStatus({
    required this.safetyLevel,
    required this.activeIncidentsCount,
    required this.guardsOnDuty,
    required this.isLockdownActive,
    required this.lastAuditTimestamp,
  });

  factory CampusSafetyStatus.fromJson(Map<String, dynamic> json) {
    return CampusSafetyStatus(
      safetyLevel: json['safetyLevel'] ?? 'normal',
      activeIncidentsCount: json['activeIncidentsCount'] ?? 0,
      guardsOnDuty: json['guardsOnDuty'] ?? 4,
      isLockdownActive: json['isLockdownActive'] ?? false,
      lastAuditTimestamp: json['lastAuditTimestamp'] ?? DateTime.now().toIso8601String(),
    );
  }
}

class GuardDispatchTask {
  final String dispatchId;
  final String incidentId;
  final String threatType;
  final String locationDescription;
  final double targetX;
  final double targetY;
  final int etaSeconds;
  final String status; // 'dispatched', 'en_route', 'on_scene', 'cleared'

  const GuardDispatchTask({
    required this.dispatchId,
    required this.incidentId,
    required this.threatType,
    required this.locationDescription,
    required this.targetX,
    required this.targetY,
    required this.etaSeconds,
    required this.status,
  });
}

class SafeWalkEscortState {
  final bool isRequested;
  final String? assignedGuardCallSign;
  final int etaMinutes;
  final String pickupLocation;
  final String destinationLocation;
  final String status; // 'idle', 'dispatching', 'en_route', 'walking', 'completed'

  const SafeWalkEscortState({
    required this.isRequested,
    this.assignedGuardCallSign,
    required this.etaMinutes,
    required this.pickupLocation,
    required this.destinationLocation,
    required this.status,
  });
}

class GuardPatrolNotifier extends StateNotifier<List<GuardDispatchTask>> {
  GuardPatrolNotifier()
      : super([
          const GuardDispatchTask(
            dispatchId: 'dsp_01',
            incidentId: 'inc_auto_01',
            threatType: 'Perimeter Intrusion',
            locationDescription: 'North Science Quad Fence',
            targetX: 45.0,
            targetY: 60.0,
            etaSeconds: 90,
            status: 'dispatched',
          ),
        ]);

  void updateTaskStatus(String dispatchId, String newStatus) {
    state = state.map((task) {
      if (task.dispatchId == dispatchId) {
        return GuardDispatchTask(
          dispatchId: task.dispatchId,
          incidentId: task.incidentId,
          threatType: task.threatType,
          locationDescription: task.locationDescription,
          targetX: task.targetX,
          targetY: task.targetY,
          etaSeconds: task.etaSeconds,
          status: newStatus,
        );
      }
      return task;
    }).toList();
  }
}

final guardPatrolProvider = StateNotifierProvider<GuardPatrolNotifier, List<GuardDispatchTask>>((ref) {
  return GuardPatrolNotifier();
});

class SafeWalkNotifier extends StateNotifier<SafeWalkEscortState> {
  SafeWalkNotifier()
      : super(const SafeWalkEscortState(
          isRequested: false,
          etaMinutes: 0,
          pickupLocation: '',
          destinationLocation: '',
          status: 'idle',
        ));

  void requestEscort(String pickup, String destination) {
    state = SafeWalkEscortState(
      isRequested: true,
      assignedGuardCallSign: 'Alpha-Patrol',
      etaMinutes: 2,
      pickupLocation: pickup,
      destinationLocation: destination,
      status: 'en_route',
    );
  }

  void completeEscort() {
    state = const SafeWalkEscortState(
      isRequested: false,
      etaMinutes: 0,
      pickupLocation: '',
      destinationLocation: '',
      status: 'completed',
    );
  }
}

final safeWalkProvider = StateNotifierProvider<SafeWalkNotifier, SafeWalkEscortState>((ref) {
  return SafeWalkNotifier();
});

final campusSafetyStatusProvider = Provider<CampusSafetyStatus>((ref) {
  return const CampusSafetyStatus(
    safetyLevel: 'normal',
    activeIncidentsCount: 1,
    guardsOnDuty: 4,
    isLockdownActive: false,
    lastAuditTimestamp: '2026-08-21T10:00:00Z',
  );
});
