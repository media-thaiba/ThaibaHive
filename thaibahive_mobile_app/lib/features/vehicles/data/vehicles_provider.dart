import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/vehicle_model.dart';

import 'vehicles_repository.dart';

class VehiclesState {
  final List<VehicleModel> vehicles;
  final List<VehicleBookingModel> bookings;
  final List<VehicleLogModel> logs;
  final bool isLoading;
  final String? error;
  final int tabIndex;

  const VehiclesState({
    this.vehicles = const [],
    this.bookings = const [],
    this.logs = const [],
    this.isLoading = false,
    this.error,
    this.tabIndex = 0,
  });

  VehiclesState copyWith({
    List<VehicleModel>? vehicles,
    List<VehicleBookingModel>? bookings,
    List<VehicleLogModel>? logs,
    bool? isLoading,
    String? error,
    int? tabIndex,
  }) =>
      VehiclesState(
        vehicles: vehicles ?? this.vehicles,
        bookings: bookings ?? this.bookings,
        logs: logs ?? this.logs,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        tabIndex: tabIndex ?? this.tabIndex,
      );
}

class VehiclesNotifier extends StateNotifier<VehiclesState> {
  final VehiclesRepository _repository;

  VehiclesNotifier(this._repository) : super(const VehiclesState());

  Future<void> loadVehicles() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final results = await Future.wait([
        _repository.getVehicles(),
        _repository.getBookings(),
        _repository.getLogs(),
      ]);
      state = state.copyWith(
        vehicles: results[0] as List<VehicleModel>,
        bookings: results[1] as List<VehicleBookingModel>,
        logs: results[2] as List<VehicleLogModel>,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setTab(int index) {
    state = state.copyWith(tabIndex: index);
  }

  Future<void> createBooking(Map<String, dynamic> data) async {
    try {
      await _repository.createBooking(data);
      await loadVehicles();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<void> updateBooking(String id, Map<String, dynamic> data) async {
    try {
      await _repository.updateBooking(id, data);
      await loadVehicles();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<void> createLog(Map<String, dynamic> data) async {
    try {
      await _repository.createLog(data);
      await loadVehicles();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }
}

final vehiclesProvider =
    StateNotifierProvider<VehiclesNotifier, VehiclesState>((ref) {
  final repo = ref.read(vehiclesRepositoryProvider);
  return VehiclesNotifier(repo);
});
