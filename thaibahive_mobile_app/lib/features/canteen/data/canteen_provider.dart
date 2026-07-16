import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/meal_model.dart';

import 'canteen_repository.dart';

class CanteenState {
  final List<MealNotificationModel> meals;
  final bool isLoading;
  final String? error;
  final DateTime selectedDate;

  CanteenState({
    this.meals = const [],
    this.isLoading = false,
    this.error,
    DateTime? selectedDate,
  }) : selectedDate = selectedDate ?? DateTime.now();

  CanteenState copyWith({
    List<MealNotificationModel>? meals,
    bool? isLoading,
    String? error,
    DateTime? selectedDate,
  }) =>
      CanteenState(
        meals: meals ?? this.meals,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        selectedDate: selectedDate ?? this.selectedDate,
      );
}

class CanteenNotifier extends StateNotifier<CanteenState> {
  final CanteenRepository _repository;

  CanteenNotifier(this._repository) : super(CanteenState());

  Future<void> loadMeals() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final dateStr =
          '${state.selectedDate.year}-${state.selectedDate.month.toString().padLeft(2, '0')}-${state.selectedDate.day.toString().padLeft(2, '0')}';
      final meals = await _repository.getMeals(date: dateStr);
      state = state.copyWith(meals: meals, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setSelectedDate(DateTime date) {
    state = state.copyWith(selectedDate: date);
    loadMeals();
  }

  Future<void> saveMealPreference(String mealType, String status,
      {int guestCount = 0, String? notes}) async {
    try {
      final dateStr =
          '${state.selectedDate.year}-${state.selectedDate.month.toString().padLeft(2, '0')}-${state.selectedDate.day.toString().padLeft(2, '0')}';
      final existing = state.meals.where((m) => m.mealType == mealType).firstOrNull;
      final data = {
        'meal_type': mealType,
        'status': status,
        'date': dateStr,
        'guest_count': guestCount,
        'notes': notes,
      };
      if (existing != null) {
        await _repository.updateMeal(existing.id, data);
      } else {
        await _repository.createMeal(data);
      }
      await loadMeals();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }
}

final canteenProvider =
    StateNotifierProvider<CanteenNotifier, CanteenState>((ref) {
  final repo = ref.read(canteenRepositoryProvider);
  return CanteenNotifier(repo);
});
