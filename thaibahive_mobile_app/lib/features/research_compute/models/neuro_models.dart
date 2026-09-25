// Mobile Data Models for NEURO-CLUSTER / ResearchCompute OS (NEURO-022)

class MobileClusterSummary {
  final String clusterId;
  final String name;
  final String status;
  final int totalNodes;
  final int totalGpus;
  final int allocatedGpus;
  final int activeJobsCount;
  final double utilizationPercentage;

  const MobileClusterSummary({
    required this.clusterId,
    required this.name,
    required this.status,
    required this.totalNodes,
    required this.totalGpus,
    required this.allocatedGpus,
    required this.activeJobsCount,
    required this.utilizationPercentage,
  });

  factory MobileClusterSummary.fromJson(Map<String, dynamic> json) {
    final totalGpus = (json['totalGpus'] as num?)?.toInt() ?? 0;
    final allocatedGpus = (json['allocatedGpus'] as num?)?.toInt() ?? 0;
    final util = totalGpus > 0 ? (allocatedGpus / totalGpus) * 100 : 0.0;

    return MobileClusterSummary(
      clusterId: json['clusterId'] ?? '',
      name: json['name'] ?? '',
      status: json['status'] ?? 'active',
      totalNodes: (json['totalNodes'] as num?)?.toInt() ?? 0,
      totalGpus: totalGpus,
      allocatedGpus: allocatedGpus,
      activeJobsCount: (json['activeJobsCount'] as num?)?.toInt() ?? 0,
      utilizationPercentage: util,
    );
  }
}

class MobileJobItem {
  final String jobId;
  final String jobName;
  final String departmentId;
  final String status;
  final String priority;
  final int requestedGpus;
  final String gpuModel;
  final int runtimeSeconds;

  const MobileJobItem({
    required this.jobId,
    required this.jobName,
    required this.departmentId,
    required this.status,
    required this.priority,
    required this.requestedGpus,
    required this.gpuModel,
    required this.runtimeSeconds,
  });

  factory MobileJobItem.fromJson(Map<String, dynamic> json) {
    return MobileJobItem(
      jobId: json['jobId'] ?? '',
      jobName: json['jobName'] ?? '',
      departmentId: json['departmentId'] ?? '',
      status: json['status'] ?? 'pending',
      priority: json['priority'] ?? 'normal',
      requestedGpus: (json['requestedGpus'] as num?)?.toInt() ?? 1,
      gpuModel: json['gpuModelRequirement'] ?? 'NVIDIA-H100',
      runtimeSeconds: (json['runtimeSeconds'] as num?)?.toInt() ?? 0,
    );
  }
}

class MobileSpotAlert {
  final String provider;
  final String instanceType;
  final double spotPriceUsd;
  final double savingsPercent;
  final String alertMessage;

  const MobileSpotAlert({
    required this.provider,
    required this.instanceType,
    required this.spotPriceUsd,
    required this.savingsPercent,
    required this.alertMessage,
  });
}
