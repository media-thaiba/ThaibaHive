import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'offline_queue.dart';

/// Provider for the singleton offline queue instance.
final offlineQueueProvider = Provider<OfflineQueue>((ref) {
  return offlineQueue;
});