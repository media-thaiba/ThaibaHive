import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'copilot_recommendation_service.dart';

class CopilotRecommendationsScreen extends ConsumerStatefulWidget {
  final String tenantId;

  const CopilotRecommendationsScreen({Key? key, this.tenantId = 'inst_101'}) : super(key: key);

  @override
  ConsumerState<CopilotRecommendationsScreen> createState() => _CopilotRecommendationsScreenState();
}

class _CopilotRecommendationsScreenState extends ConsumerState<CopilotRecommendationsScreen> {
  bool _isLoading = false;
  List<CopilotRecommendationItem> _recommendations = [];

  @override
  void initState() {
    super.initState();
    _loadRecommendations();
  }

  Future<void> _loadRecommendations() async {
    setState(() => _isLoading = true);
    final service = ref.read(copilotRecommendationServiceProvider);
    final results = await service.fetchRecommendations(widget.tenantId);
    setState(() {
      _recommendations = results;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Copilot Recommendations'),
      ),
      body: RefreshIndicator(
        onRefresh: _loadRecommendations,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _recommendations.isEmpty
                ? const Center(child: Text('No active AI copilot recommendations.'))
                : ListView.builder(
                    padding: const EdgeInsets.all(16.0),
                    itemCount: _recommendations.length,
                    itemBuilder: (context, index) {
                      final item = _recommendations[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12.0),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Chip(label: Text(item.domain.toUpperCase())),
                                  Text(
                                    '${(item.confidenceScore * 100).toInt()}% Conf.',
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                item.title,
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              Text(item.summary),
                              const SizedBox(height: 8),
                              Text(
                                'Status: ${item.humanApprovalStatus}',
                                style: TextStyle(
                                  color: item.humanApprovalStatus == 'AUTO_EXECUTE'
                                      ? Colors.green
                                      : Colors.orange,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
