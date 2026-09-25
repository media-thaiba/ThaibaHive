// Flutter Unit Tests for NEURO-CLUSTER / ResearchCompute OS (NEURO-022)

import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/research_compute/models/neuro_models.dart';
import 'package:thaibahive_mobile/features/research_compute/services/neuro_service.dart';

void main() {
  group('NEURO-CLUSTER Mobile Models and Services', () {
    test('MobileClusterSummary should parse from JSON correctly and compute utilization', () {
      final json = {
        'clusterId': 'CLUSTER-01',
        'name': 'HPC Cluster',
        'status': 'active',
        'totalNodes': 8,
        'totalGpus': 64,
        'allocatedGpus': 48,
        'activeJobsCount': 6,
      };

      final summary = MobileClusterSummary.fromJson(json);
      expect(summary.clusterId, 'CLUSTER-01');
      expect(summary.name, 'HPC Cluster');
      expect(summary.totalGpus, 64);
      expect(summary.allocatedGpus, 48);
      expect(summary.utilizationPercentage, 75.0);
    });

    test('MobileJobItem should parse job model fields accurately', () {
      final json = {
        'jobId': 'JOB-LLM-01',
        'jobName': 'Llama-3-FineTune',
        'departmentId': 'dept_cs',
        'status': 'running',
        'priority': 'urgent',
        'requestedGpus': 8,
        'gpuModelRequirement': 'NVIDIA-H100',
        'runtimeSeconds': 1200,
      };

      final job = MobileJobItem.fromJson(json);
      expect(job.jobId, 'JOB-LLM-01');
      expect(job.jobName, 'Llama-3-FineTune');
      expect(job.requestedGpus, 8);
      expect(job.gpuModel, 'NVIDIA-H100');
    });

    test('NeuroClusterService should fetch cluster summary and active jobs', () async {
      final service = NeuroClusterService();

      final summary = await service.fetchClusterSummary('CLUSTER-TITAN-01');
      expect(summary.clusterId, 'CLUSTER-TITAN-01');
      expect(summary.totalNodes, 16);

      final jobs = await service.fetchActiveJobs();
      expect(jobs.length, 2);
      expect(jobs[0].jobId, 'JOB-LLM-70B');

      final cordonResult = await service.triggerEmergencyCordon('node_01');
      expect(cordonResult, true);
    });
  });
}
