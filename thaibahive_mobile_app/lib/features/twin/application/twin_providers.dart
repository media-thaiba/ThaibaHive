// Flutter State Models & Riverpod Providers for Digital Twin & Spatial Intelligence (TWIN-022)

import 'package:flutter_riverpod/flutter_riverpod.dart';

class SpaceComfortItem {
  final String spaceId;
  final String code;
  final String name;
  final String facility;
  final int floorLevel;
  final int capacity;
  final int currentOccupancy;
  final double comfortScore;
  final double tempC;
  final int co2Ppm;
  final double noiseDb;
  final bool isAvailable;

  SpaceComfortItem({
    required this.spaceId,
    required this.code,
    required this.name,
    required this.facility,
    required this.floorLevel,
    required this.capacity,
    required this.currentOccupancy,
    required this.comfortScore,
    required this.tempC,
    required this.co2Ppm,
    required this.noiseDb,
    this.isAvailable = true,
  });

  factory SpaceComfortItem.fromJson(Map<String, dynamic> json) {
    return SpaceComfortItem(
      spaceId: json['spaceId'] ?? '',
      code: json['code'] ?? '',
      name: json['name'] ?? '',
      facility: json['facility'] ?? '',
      floorLevel: json['floorLevel'] ?? 0,
      capacity: json['capacity'] ?? 30,
      currentOccupancy: json['currentOccupancy'] ?? 0,
      comfortScore: (json['comfortScore'] as num?)?.toDouble() ?? 100.0,
      tempC: (json['tempC'] as num?)?.toDouble() ?? 22.0,
      co2Ppm: json['co2Ppm'] ?? 450,
      noiseDb: (json['noiseDb'] as num?)?.toDouble() ?? 40.0,
      isAvailable: json['isAvailable'] ?? true,
    );
  }
}

class EmergencyCompassState {
  final String nearestExitName;
  final double distanceMeters;
  final double bearingDegrees; // 0 - 360
  final bool isHazardActive;
  final String? hazardMessage;

  const EmergencyCompassState({
    required this.nearestExitName,
    required this.distanceMeters,
    required this.bearingDegrees,
    this.isHazardActive = false,
    this.hazardMessage,
  });
}

class TwinMapState {
  final List<SpaceComfortItem> spaces;
  final int selectedFloor;
  final bool isLoading;
  final EmergencyCompassState? emergencyState;

  const TwinMapState({
    this.spaces = const [],
    this.selectedFloor = 1,
    this.isLoading = false,
    this.emergencyState,
  });

  TwinMapState copyWith({
    List<SpaceComfortItem>? spaces,
    int? selectedFloor,
    bool? isLoading,
    EmergencyCompassState? emergencyState,
  }) {
    return TwinMapState(
      spaces: spaces ?? this.spaces,
      selectedFloor: selectedFloor ?? this.selectedFloor,
      isLoading: isLoading ?? this.isLoading,
      emergencyState: emergencyState ?? this.emergencyState,
    );
  }
}

class TwinMapNotifier extends StateNotifier<TwinMapState> {
  TwinMapNotifier() : super(const TwinMapState());

  void setFloor(int floor) {
    state = state.copyWith(selectedFloor: floor);
  }

  void setSpaces(List<SpaceComfortItem> spaces) {
    state = state.copyWith(spaces: spaces);
  }

  void setEmergency(EmergencyCompassState emergency) {
    state = state.copyWith(emergencyState: emergency);
  }

  void clearEmergency() {
    state = state.copyWith(emergencyState: null);
  }
}

final twinMapProvider = StateNotifierProvider<TwinMapNotifier, TwinMapState>((ref) {
  return TwinMapNotifier();
});
