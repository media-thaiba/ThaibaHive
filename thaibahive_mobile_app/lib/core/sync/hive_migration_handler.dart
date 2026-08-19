import 'package:hive/hive.dart';

class HiveMigrationHandler {
  static const int currentSchemaVersion = 1;
  static const String versionBoxName = 'app_metadata_v1';

  static Future<void> checkAndMigrate() async {
    final metadataBox = await Hive.openBox(versionBoxName);
    final storedVersion = metadataBox.get('schema_version', defaultValue: 0) as int;

    if (storedVersion < currentSchemaVersion) {
      // Migrate or clear stale mock data from version 0
      if (storedVersion == 0) {
        if (await Hive.boxExists('offline_sync_queue')) {
          await Hive.deleteBoxFromDisk('offline_sync_queue');
        }
      }
      await metadataBox.put('schema_version', currentSchemaVersion);
    }
  }
}
