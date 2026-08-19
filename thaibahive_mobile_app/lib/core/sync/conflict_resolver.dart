class ConflictResolver {
  Map<String, dynamic> mergeLWW({
    required Map<String, dynamic> localData,
    required Map<String, dynamic> serverData,
    required String localTimestamp,
    required String serverTimestamp,
  }) {
    final localTime = DateTime.tryParse(localTimestamp)?.millisecondsSinceEpoch ?? 0;
    final serverTime = DateTime.tryParse(serverTimestamp)?.millisecondsSinceEpoch ?? 0;

    if (localTime >= serverTime) {
      return {...serverData, ...localData};
    } else {
      return {...localData, ...serverData};
    }
  }
}
