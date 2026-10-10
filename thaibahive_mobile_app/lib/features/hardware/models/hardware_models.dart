class HardwareZoneModel {
  final String id;
  final String name;
  final String type;
  final int floorNumber;
  final bool isMusterPoint;
  final double? coordinatesX;
  final double? coordinatesY;

  const HardwareZoneModel({
    required this.id,
    required this.name,
    required this.type,
    required this.floorNumber,
    this.isMusterPoint = false,
    this.coordinatesX,
    this.coordinatesY,
  });

  factory HardwareZoneModel.fromJson(Map<String, dynamic> json) {
    return HardwareZoneModel(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String? ?? 'room',
      floorNumber: (json['floorNumber'] as num?)?.toInt() ?? 0,
      isMusterPoint: json['isMusterPoint'] == true || json['isMusterPoint'] == 1,
      coordinatesX: (json['coordinatesX'] as num?)?.toDouble(),
      coordinatesY: (json['coordinatesY'] as num?)?.toDouble(),
    );
  }
}

class GateVerificationResult {
  final bool granted;
  final String verificationResult;
  final String eventId;
  final bool antiPassbackViolation;
  final bool emergencyOverride;
  final String? reason;

  const GateVerificationResult({
    required this.granted,
    required this.verificationResult,
    required this.eventId,
    this.antiPassbackViolation = false,
    this.emergencyOverride = false,
    this.reason,
  });

  factory GateVerificationResult.fromJson(Map<String, dynamic> json) {
    return GateVerificationResult(
      granted: json['granted'] == true,
      verificationResult: json['verificationResult'] as String? ?? 'unknown',
      eventId: json['eventId'] as String? ?? '',
      antiPassbackViolation: json['antiPassbackViolation'] == true,
      emergencyOverride: json['emergencyOverride'] == true,
      reason: json['reason'] as String?,
    );
  }
}

class MusterSummaryModel {
  final int totalOccupantsOnSite;
  final int accountedInMusterCount;
  final int missingOccupantsCount;
  final double evacuationPercentage;

  const MusterSummaryModel({
    required this.totalOccupantsOnSite,
    required this.accountedInMusterCount,
    required this.missingOccupantsCount,
    required this.evacuationPercentage,
  });

  factory MusterSummaryModel.fromJson(Map<String, dynamic> json) {
    return MusterSummaryModel(
      totalOccupantsOnSite: (json['totalOccupantsOnSite'] as num?)?.toInt() ?? 0,
      accountedInMusterCount: (json['accountedInMusterCount'] as num?)?.toInt() ?? 0,
      missingOccupantsCount: (json['missingOccupantsCount'] as num?)?.toInt() ?? 0,
      evacuationPercentage: (json['evacuationPercentage'] as num?)?.toDouble() ?? 100.0,
    );
  }
}

class PatrolCheckpointScan {
  final String checkpointId;
  final String zoneName;
  final String scannedAt;
  final String method; // 'nfc' | 'qr' | 'ble'
  final bool synced;

  const PatrolCheckpointScan({
    required this.checkpointId,
    required this.zoneName,
    required this.scannedAt,
    this.method = 'nfc',
    this.synced = true,
  });
}
