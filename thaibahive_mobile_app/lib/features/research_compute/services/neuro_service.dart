// Flutter Service & Riverpod State Providers for NEURO-CLUSTER (NEURO-022)

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/neuro_models.dart';

class NeuroClusterService {
  Future<MobileClusterSummary> fetchClusterSummary(String clusterId) async {
    // Simulated live cluster summary response
    return const MobileClusterSummary(
      clusterId: 'CLUSTER-TITAN-01',
      name: 'Titan Deep Learning Cluster',
      status: 'active',
      totalNodes: 16,
      totalGpus: 128,
      allocatedGpus: 96,
      activeJobsCount: 12,
      utilizationPercentage: 75.0,
    );
  }

  Future<List<MobileJobItem>> fetchActiveJobs() async {
    return const [
      MobileJobItem(
        jobId: 'JOB-LLM-70B',
        jobName: 'Llama-3.1-70B-FineTune',
        departmentId: 'dept_cs',
        status: 'running',
        priority: 'high',
        requestedGpus: 8,
        gpuModel: 'NVIDIA-H100',
        runtimeSeconds: 7420,
      ),
      MobileJobItem(
        jobId: 'JOB-PROTEIN-01',
        jobName: 'AlphaFold-3-Conformations',
        departmentId: 'dept_biomed',
        status: 'running',
        priority: 'normal',
        requestedGpus: 4,
        gpuModel: 'NVIDIA-H100',
        runtimeSeconds: 3100,
      ),
    ];
  }

  Future<bool> triggerEmergencyCordon(String nodeId) async {
    // Simulates emergency node cordon/drain from mobile app
    return true;
  }
}

final neuroServiceProvider = Provider<NeuroClusterService>((ref) {
  return NeuroClusterService();
});

final clusterSummaryProvider = FutureProvider.family<MobileClusterSummary, String>((ref, clusterId) async {
  final service = ref.watch(neuroServiceProvider);
  return service.fetchClusterSummary(clusterId);
});

final activeJobsProvider = FutureProvider<List<MobileJobItem>>((ref) async {
  final service = ref.watch(neuroServiceProvider);
  return service.fetchActiveJobs();
});
