// Data Models for Mobile AIGENT-OS Multi-Agent Cockpit (MOB-001)

class MobileAgentInfo {
  final String id;
  final String role;
  final String domain;
  final String status;
  final int currentLoad;
  final int maxConcurrency;
  final List<String> capabilities;
  final String? lastActiveAt;

  const MobileAgentInfo({
    required this.id,
    required this.role,
    required this.domain,
    required this.status,
    required this.currentLoad,
    required this.maxConcurrency,
    this.capabilities = const [],
    this.lastActiveAt,
  });

  factory MobileAgentInfo.fromJson(Map<String, dynamic> json) {
    return MobileAgentInfo(
      id: json['id']?.toString() ?? '',
      role: json['role']?.toString() ?? json['name']?.toString() ?? '',
      domain: json['domain']?.toString() ?? 'general',
      status: json['status']?.toString() ?? 'idle',
      currentLoad: json['currentLoad'] is int ? json['currentLoad'] : int.tryParse(json['currentLoad']?.toString() ?? '0') ?? 0,
      maxConcurrency: json['maxConcurrency'] is int ? json['maxConcurrency'] : int.tryParse(json['maxConcurrency']?.toString() ?? '5') ?? 5,
      capabilities: (json['capabilities'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      lastActiveAt: json['lastActiveAt']?.toString() ?? json['updatedAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'role': role,
    'domain': domain,
    'status': status,
    'currentLoad': currentLoad,
    'maxConcurrency': maxConcurrency,
    'capabilities': capabilities,
    'lastActiveAt': lastActiveAt,
  };
}

class MobileApprovalGate {
  final String id;
  final String runId;
  final String requiredPermission;
  final String severity;
  final String status;
  final String? actionType;
  final Map<String, dynamic>? payload;
  final String? timeoutAt;
  final String createdAt;

  const MobileApprovalGate({
    required this.id,
    required this.runId,
    required this.requiredPermission,
    required this.severity,
    required this.status,
    this.actionType,
    this.payload,
    this.timeoutAt,
    required this.createdAt,
  });

  bool get isCritical => severity.toLowerCase() == 'critical';
  bool get isHigh => severity.toLowerCase() == 'high';

  factory MobileApprovalGate.fromJson(Map<String, dynamic> json) {
    return MobileApprovalGate(
      id: json['id']?.toString() ?? json['gateId']?.toString() ?? '',
      runId: json['runId']?.toString() ?? '',
      requiredPermission: json['requiredPermission']?.toString() ?? json['permission']?.toString() ?? 'agent:workflows:approve',
      severity: json['severity']?.toString() ?? 'medium',
      status: json['status']?.toString() ?? 'pending',
      actionType: json['actionType']?.toString() ?? json['stepName']?.toString(),
      payload: json['payload'] is Map<String, dynamic> ? json['payload'] : null,
      timeoutAt: json['timeoutAt']?.toString(),
      createdAt: json['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'runId': runId,
    'requiredPermission': requiredPermission,
    'severity': severity,
    'status': status,
    'actionType': actionType,
    'payload': payload,
    'timeoutAt': timeoutAt,
    'createdAt': createdAt,
  };
}

class MobileWorkflowRun {
  final String id;
  final String workflowId;
  final String workflowName;
  final String status;
  final int currentStep;
  final int totalSteps;
  final String startedAt;
  final int? durationMs;
  final String? error;

  const MobileWorkflowRun({
    required this.id,
    required this.workflowId,
    required this.workflowName,
    required this.status,
    required this.currentStep,
    required this.totalSteps,
    required this.startedAt,
    this.durationMs,
    this.error,
  });

  factory MobileWorkflowRun.fromJson(Map<String, dynamic> json) {
    return MobileWorkflowRun(
      id: json['id']?.toString() ?? json['runId']?.toString() ?? '',
      workflowId: json['workflowId']?.toString() ?? '',
      workflowName: json['workflowName']?.toString() ?? json['name']?.toString() ?? 'Workflow Execution',
      status: json['status']?.toString() ?? 'running',
      currentStep: json['currentStep'] is int ? json['currentStep'] : 0,
      totalSteps: json['totalSteps'] is int ? json['totalSteps'] : 1,
      startedAt: json['startedAt']?.toString() ?? json['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
      durationMs: json['durationMs'] is int ? json['durationMs'] : null,
      error: json['error']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'workflowId': workflowId,
    'workflowName': workflowName,
    'status': status,
    'currentStep': currentStep,
    'totalSteps': totalSteps,
    'startedAt': startedAt,
    'durationMs': durationMs,
    'error': error,
  };
}
