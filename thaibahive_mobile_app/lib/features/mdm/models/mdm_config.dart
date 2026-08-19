class MdmConfig {
  final String? serverUrl;
  final String? tenantKey;
  final String? tenantId;
  final bool allowExport;
  final bool forcePasscode;
  final int sessionTimeoutMins;

  const MdmConfig({
    this.serverUrl,
    this.tenantKey,
    this.tenantId,
    this.allowExport = true,
    this.forcePasscode = false,
    this.sessionTimeoutMins = 30,
  });

  factory MdmConfig.fromMap(Map<String, dynamic> map) {
    return MdmConfig(
      serverUrl: map['server_url'] as String?,
      tenantKey: map['tenant_key'] as String?,
      tenantId: map['tenant_id'] as String?,
      allowExport: map['allow_export'] as bool? ?? true,
      forcePasscode: map['force_passcode'] as bool? ?? false,
      sessionTimeoutMins: map['session_timeout_mins'] as int? ?? 30,
    );
  }
}
