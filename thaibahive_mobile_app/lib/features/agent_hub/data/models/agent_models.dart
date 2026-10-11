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

class MobileAgentPlugin {
  final String id;
  final String pluginKey;
  final String displayName;
  final String summary;
  final String? description;
  final String version;
  final String category;
  final double ratingAvg;
  final int ratingCount;
  final int installedCount;
  final List<String> capabilities;
  final Map<String, dynamic> manifest;
  final bool isInstalled;
  final bool isEnabled;
  final List<String> grantedPermissions;
  final String? installationId;
  final bool authorVerified;
  final String scope;

  const MobileAgentPlugin({
    required this.id,
    required this.pluginKey,
    required this.displayName,
    required this.summary,
    this.description,
    required this.version,
    required this.category,
    this.ratingAvg = 0.0,
    this.ratingCount = 0,
    this.installedCount = 0,
    this.capabilities = const [],
    this.manifest = const {},
    this.isInstalled = false,
    this.isEnabled = true,
    this.grantedPermissions = const [],
    this.installationId,
    this.authorVerified = false,
    this.scope = 'global',
  });

  MobileAgentPlugin copyWith({
    String? id,
    String? pluginKey,
    String? displayName,
    String? summary,
    String? description,
    String? version,
    String? category,
    double? ratingAvg,
    int? ratingCount,
    int? installedCount,
    List<String>? capabilities,
    Map<String, dynamic>? manifest,
    bool? isInstalled,
    bool? isEnabled,
    List<String>? grantedPermissions,
    String? installationId,
    bool? authorVerified,
    String? scope,
  }) {
    return MobileAgentPlugin(
      id: id ?? this.id,
      pluginKey: pluginKey ?? this.pluginKey,
      displayName: displayName ?? this.displayName,
      summary: summary ?? this.summary,
      description: description ?? this.description,
      version: version ?? this.version,
      category: category ?? this.category,
      ratingAvg: ratingAvg ?? this.ratingAvg,
      ratingCount: ratingCount ?? this.ratingCount,
      installedCount: installedCount ?? this.installedCount,
      capabilities: capabilities ?? this.capabilities,
      manifest: manifest ?? this.manifest,
      isInstalled: isInstalled ?? this.isInstalled,
      isEnabled: isEnabled ?? this.isEnabled,
      grantedPermissions: grantedPermissions ?? this.grantedPermissions,
      installationId: installationId ?? this.installationId,
      authorVerified: authorVerified ?? this.authorVerified,
      scope: scope ?? this.scope,
    );
  }

  factory MobileAgentPlugin.fromJson(Map<String, dynamic> json) {
    List<String> parseList(dynamic raw) {
      if (raw is List) return raw.map((e) => e.toString()).toList();
      return const [];
    }

    double parseDouble(dynamic raw) {
      if (raw is num) return raw.toDouble();
      if (raw is String) return double.tryParse(raw) ?? 0.0;
      return 0.0;
    }

    int parseInt(dynamic raw) {
      if (raw is int) return raw;
      if (raw is num) return raw.toInt();
      if (raw is String) return int.tryParse(raw) ?? 0;
      return 0;
    }

    final manifestRaw = json['manifest'];
    final Map<String, dynamic> manifestData = manifestRaw is Map
        ? Map<String, dynamic>.from(manifestRaw)
        : const <String, dynamic>{};

    return MobileAgentPlugin(
      id: json['id']?.toString() ?? '',
      pluginKey: json['pluginKey']?.toString() ?? '',
      displayName: json['displayName']?.toString() ?? '',
      summary: json['summary']?.toString() ?? '',
      description: json['description']?.toString(),
      version: json['version']?.toString() ?? '1.0.0',
      category: json['category']?.toString() ?? 'general',
      ratingAvg: parseDouble(json['ratingAvg']),
      ratingCount: parseInt(json['ratingCount']),
      installedCount: parseInt(json['installedCount']),
      capabilities: parseList(json['capabilities']),
      manifest: manifestData,
      isInstalled: json['isInstalled'] == true || json['installationId'] != null,
      isEnabled: json['enabled'] != false && json['isEnabled'] != false,
      grantedPermissions: parseList(json['grantedPermissions'] ?? json['grantedToolPermissions']),
      installationId: json['installationId']?.toString(),
      authorVerified: json['authorVerified'] == true,
      scope: json['scope']?.toString() ?? 'global',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'pluginKey': pluginKey,
    'displayName': displayName,
    'summary': summary,
    'description': description,
    'version': version,
    'category': category,
    'ratingAvg': ratingAvg,
    'ratingCount': ratingCount,
    'installedCount': installedCount,
    'capabilities': capabilities,
    'manifest': manifest,
    'isInstalled': isInstalled,
    'isEnabled': isEnabled,
    'grantedPermissions': grantedPermissions,
    'installationId': installationId,
    'authorVerified': authorVerified,
    'scope': scope,
  };
}

class MobileLiveSnippet {
  final String id;
  final String sessionId;
  final String speaker;
  final String text;
  final String? hazardType;
  final String? severity;
  final String timestamp;

  const MobileLiveSnippet({
    required this.id,
    required this.sessionId,
    required this.speaker,
    required this.text,
    this.hazardType,
    this.severity,
    required this.timestamp,
  });

  bool get isHazard => hazardType != null && hazardType!.isNotEmpty;

  factory MobileLiveSnippet.fromJson(Map<String, dynamic> json) {
    return MobileLiveSnippet(
      id: json['id']?.toString() ?? '',
      sessionId: json['sessionId']?.toString() ?? '',
      speaker: json['speaker']?.toString() ?? 'system',
      text: json['text']?.toString() ?? '',
      hazardType: json['hazardType']?.toString(),
      severity: json['severity']?.toString(),
      timestamp: json['timestamp']?.toString() ?? DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'sessionId': sessionId,
    'speaker': speaker,
    'text': text,
    'hazardType': hazardType,
    'severity': severity,
    'timestamp': timestamp,
  };
}
