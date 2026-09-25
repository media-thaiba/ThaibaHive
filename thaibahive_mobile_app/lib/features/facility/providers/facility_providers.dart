import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../models/facility_models.dart';

final technicianWorkOrdersProvider = FutureProvider<List<TechnicianWorkOrder>>((ref) async {
  try {
    final response = await http.get(
      Uri.parse('/api/facility/workorders'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final list = (data['workOrders'] as List?) ?? [];
      return list.map((item) => TechnicianWorkOrder.fromJson(item)).toList();
    }
  } catch (_) {
    // Offline fallback / local cache mock
  }

  return [
    TechnicianWorkOrder(
      id: 'mock_wo_1',
      workOrderNumber: 'WO-2026-00452',
      title: 'Emergency Chiller Bearing Spalling Replacement',
      description: 'Spectral FFT identified 106.8 Hz outer race defect (BPFO). Immediate bearing replacement required.',
      priority: 'emergency',
      category: 'hvac',
      status: 'assigned',
      buildingId: 'bldg_eng',
      floorId: 'floor_basement',
      roomId: 'room_mep_01',
      equipmentId: 'CHILLER-01',
      estimatedDurationMinutes: 90,
    ),
    TechnicianWorkOrder(
      id: 'mock_wo_2',
      workOrderNumber: 'WO-2026-00453',
      title: 'Science Wing AHU Filter Differential Pressure Check',
      description: 'Filter Delta P exceeded 185 Pa. Replace MERV-13 pleated filters.',
      priority: 'routine',
      category: 'hvac',
      status: 'scheduled',
      buildingId: 'bldg_sci',
      floorId: 'floor_roof',
      equipmentId: 'AHU-04',
      estimatedDurationMinutes: 60,
    ),
  ];
});
