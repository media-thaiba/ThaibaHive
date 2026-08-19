import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/sync/offline_sync_queue.dart';

/// OfflineSyncStatusWidget — Compact badge showing pending outbox queue depth.
///
/// Displays count of records waiting to be pushed on next network availability.
/// Used in AppBar / dashboard summaries for real-time connectivity awareness.
class OfflineSyncStatusWidget extends ConsumerStatefulWidget {
  const OfflineSyncStatusWidget({super.key});

  @override
  ConsumerState<OfflineSyncStatusWidget> createState() =>
      _OfflineSyncStatusWidgetState();
}

class _OfflineSyncStatusWidgetState
    extends ConsumerState<OfflineSyncStatusWidget> {
  int _pendingCount = 0;
  bool _loading = true;

  final OfflineSyncQueue _queue = OfflineSyncQueue();

  @override
  void initState() {
    super.initState();
    _loadPendingCount();
  }

  Future<void> _loadPendingCount() async {
    try {
      await _queue.initialize();
      final records = await _queue.getPendingRecords();
      setState(() {
        _pendingCount = records.length;
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_loading) {
      return const SizedBox(
        width: 16,
        height: 16,
        child: CircularProgressIndicator(strokeWidth: 1.5),
      );
    }

    if (_pendingCount == 0) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.cloud_done, color: Colors.green[600], size: 16),
          const SizedBox(width: 4),
          Text(
            'Synced',
            style: theme.textTheme.labelSmall?.copyWith(
              color: Colors.green[700],
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      );
    }

    return GestureDetector(
      onTap: _loadPendingCount,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: theme.colorScheme.errorContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.cloud_off, color: theme.colorScheme.error, size: 14),
            const SizedBox(width: 4),
            Text(
              '$_pendingCount pending',
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onErrorContainer,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
