// Flutter UI Screen for NEURO-CLUSTER Mobile HPC Monitor (NEURO-022)

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/neuro_service.dart';
import '../../models/neuro_models.dart';

class NeuroClusterScreen extends ConsumerWidget {
  const NeuroClusterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clusterAsync = ref.watch(clusterSummaryProvider('CLUSTER-TITAN-01'));
    final jobsAsync = ref.watch(activeJobsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('NEURO-CLUSTER HPC Monitor'),
        backgroundColor: Colors.indigo.shade900,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(clusterSummaryProvider);
              ref.invalidate(activeJobsProvider);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(clusterSummaryProvider);
          ref.invalidate(activeJobsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            clusterAsync.when(
              data: (summary) => _buildClusterCard(context, summary),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Text('Error: $err'),
            ),
            const SizedBox(height: 20),
            const Text(
              'Active Distributed Jobs',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            jobsAsync.when(
              data: (jobs) => Column(
                children: jobs.map((j) => _buildJobTile(context, j)).toList(),
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Text('Error: $err'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClusterCard(BuildContext context, MobileClusterSummary summary) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  summary.name,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Chip(
                  label: Text(summary.status.toUpperCase()),
                  backgroundColor: Colors.green.shade100,
                  labelStyle: TextStyle(color: Colors.green.shade800, fontSize: 10),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem('Nodes', '${summary.totalNodes}'),
                _buildStatItem('GPUs', '${summary.allocatedGpus} / ${summary.totalGpus}'),
                _buildStatItem('Utilization', '${summary.utilizationPercentage.toStringAsFixed(0)}%'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }

  Widget _buildJobTile(BuildContext context, MobileJobItem job) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8.0),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.indigo.shade50,
          child: const Icon(Icons.memory, color: Colors.indigo),
        ),
        title: Text(job.jobName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text('${job.departmentId} • ${job.requestedGpus}x ${job.gpuModel} • ${job.runtimeSeconds}s'),
        trailing: Chip(
          label: Text(job.status.toUpperCase()),
          backgroundColor: Colors.blue.shade50,
          labelStyle: TextStyle(color: Colors.blue.shade800, fontSize: 10),
        ),
      ),
    );
  }
}
