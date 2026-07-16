import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/recognition_model.dart';
import 'recognition_repository.dart';

final recognitionTypeProvider = StateProvider<String>((ref) => 'all');

final recognitionListProvider =
    AsyncNotifierProvider<RecognitionListNotifier, List<RecognitionModel>>(
  RecognitionListNotifier.new,
);

class RecognitionListNotifier extends AsyncNotifier<List<RecognitionModel>> {
  @override
  Future<List<RecognitionModel>> build() async {
    final type = ref.watch(recognitionTypeProvider);
    final repo = ref.watch(recognitionRepositoryProvider);
    return repo.getRecognitions(type: type);
  }

  Future<void> refresh() async {
    final repo = ref.watch(recognitionRepositoryProvider);
    final type = ref.read(recognitionTypeProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => repo.getRecognitions(type: type));
  }

  Future<void> giveKudos(Map<String, dynamic> data) async {
    final repo = ref.watch(recognitionRepositoryProvider);
    await repo.createRecognition(data);
    await refresh();
  }
}
