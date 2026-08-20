import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

class FederatedModelItem {
  final String modelId;
  final String name;
  final String domain;
  final String status;
  final int currentRound;

  const FederatedModelItem({
    required this.modelId,
    required this.name,
    required this.domain,
    required this.status,
    required this.currentRound,
  });

  factory FederatedModelItem.fromJson(Map<String, dynamic> json) {
    return FederatedModelItem(
      modelId: json['modelId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      domain: json['domain'] as String? ?? '',
      status: json['status'] as String? ?? 'initialized',
      currentRound: (json['currentRound'] as num?)?.toInt() ?? 0,
    );
  }
}

class FederatedMeshState {
  final List<FederatedModelItem> models;
  final double consumedEpsilon;
  final double totalEpsilon;
  final bool isLoading;
  final String? errorMessage;

  const FederatedMeshState({
    this.models = const [],
    this.consumedEpsilon = 0.0,
    this.totalEpsilon = 10.0,
    this.isLoading = false,
    this.errorMessage,
  });

  FederatedMeshState copyWith({
    List<FederatedModelItem>? models,
    double? consumedEpsilon,
    double? totalEpsilon,
    bool? isLoading,
    String? errorMessage,
  }) {
    return FederatedMeshState(
      models: models ?? this.models,
      consumedEpsilon: consumedEpsilon ?? this.consumedEpsilon,
      totalEpsilon: totalEpsilon ?? this.totalEpsilon,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class FederatedLearningNotifier extends StateNotifier<FederatedMeshState> {
  final ApiClient _apiClient;

  FederatedLearningNotifier(this._apiClient) : super(const FederatedMeshState());

  Future<void> loadFederatedState() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _apiClient.get('/api/operations/federated/models');
      final rawList = response.data['models'] as List<dynamic>? ?? [];
      final models = rawList
          .map((m) => FederatedModelItem.fromJson(m as Map<String, dynamic>))
          .toList();

      state = state.copyWith(
        models: models,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
    }
  }
}

final federatedLearningProvider =
    StateNotifierProvider<FederatedLearningNotifier, FederatedMeshState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return FederatedLearningNotifier(apiClient);
});
