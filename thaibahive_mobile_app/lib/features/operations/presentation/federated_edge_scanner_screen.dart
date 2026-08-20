import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../application/federated_providers.dart';

class FederatedEdgeScannerScreen extends ConsumerWidget {
  const FederatedEdgeScannerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(federatedLearningProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Federated Edge Intelligence'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(federatedLearningProvider.notifier).loadFederatedState(),
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.errorMessage != null
              ? Center(child: Text('Error: ${state.errorMessage}'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16.0),
                  itemCount: state.models.length,
                  itemBuilder: (context, index) {
                    final model = state.models[index];
                    return Card(
                      child: ListTile(
                        title: Text(model.name),
                        subtitle: Text('Domain: ${model.domain} | Round: ${model.currentRound}'),
                        trailing: Chip(
                          label: Text(model.status.toUpperCase()),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
