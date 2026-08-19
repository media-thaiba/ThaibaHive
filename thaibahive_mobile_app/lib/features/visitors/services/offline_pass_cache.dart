class OfflinePassCacheManager {
  static final List<Map<String, String>> _offlineGateLogs = [];

  static void addGateLog(String passId, String actionType, String visitorName) {
    _offlineGateLogs.add({
      'passId': passId,
      'actionType': actionType,
      'visitorName': visitorName,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  static List<Map<String, String>> getPendingLogs() {
    return List.unmodifiable(_offlineGateLogs);
  }

  static void clearLogs() {
    _offlineGateLogs.clear();
  }
}
