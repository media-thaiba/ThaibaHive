class TechnicianWorkOrder {
  final String id;
  final String workOrderNumber;
  final String title;
  final String description;
  final String priority;
  final String category;
  final String status;
  final String buildingId;
  final String floorId;
  final String? roomId;
  final String? equipmentId;
  final int estimatedDurationMinutes;
  final String? resolutionSummary;
  final String? technicianSignature;
  final String? startedAt;
  final String? completedAt;

  TechnicianWorkOrder({
    required this.id,
    required this.workOrderNumber,
    required this.title,
    required this.description,
    required this.priority,
    required this.category,
    required this.status,
    required this.buildingId,
    required this.floorId,
    this.roomId,
    this.equipmentId,
    this.estimatedDurationMinutes = 60,
    this.resolutionSummary,
    this.technicianSignature,
    this.startedAt,
    this.completedAt,
  });

  factory TechnicianWorkOrder.fromJson(Map<String, dynamic> json) {
    return TechnicianWorkOrder(
      id: json['id']?.toString() ?? '',
      workOrderNumber: json['workOrderNumber'] ?? json['work_order_number'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      priority: json['priority'] ?? 'routine',
      category: json['category'] ?? 'general',
      status: json['status'] ?? 'scheduled',
      buildingId: json['buildingId'] ?? json['building_id'] ?? '',
      floorId: json['floorId'] ?? json['floor_id'] ?? '',
      roomId: json['roomId'] ?? json['room_id'],
      equipmentId: json['equipmentId'] ?? json['equipment_id'],
      estimatedDurationMinutes: json['estimatedDurationMinutes'] ?? json['estimated_duration_minutes'] ?? 60,
      resolutionSummary: json['resolutionSummary'] ?? json['resolution_summary'],
      technicianSignature: json['technicianSignature'] ?? json['technician_signature'],
      startedAt: json['startedAt'] ?? json['started_at'],
      completedAt: json['completedAt'] ?? json['completed_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workOrderNumber': workOrderNumber,
      'title': title,
      'description': description,
      'priority': priority,
      'category': category,
      'status': status,
      'buildingId': buildingId,
      'floorId': floorId,
      'roomId': roomId,
      'equipmentId': equipmentId,
      'estimatedDurationMinutes': estimatedDurationMinutes,
      'resolutionSummary': resolutionSummary,
      'technicianSignature': technicianSignature,
      'startedAt': startedAt,
      'completedAt': completedAt,
    };
  }
}
