import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';
import 'package:thaibahive_mobile/features/sync/data/sync_status_providers.dart';

/// StreamProvider polling failed + conflict events count for real-time banner display.
final failedEventsCountProvider = StreamProvider.autoDispose<int>((ref) async* {
  int getCount() {
    return offlineQueue.getFailedEvents().length +
        offlineQueue.getConflictEvents().length;
  }

  // Initial value
  yield getCount();

  final stream = Stream.periodic(const Duration(seconds: 2), (_) => getCount());
  await for (final count in stream) {
    yield count;
  }
});

class SyncStatusBanner extends ConsumerWidget {
  const SyncStatusBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final failedCountAsync = ref.watch(failedEventsCountProvider);
    final syncState = ref.watch(syncStatusProvider);

    final failedCount = failedCountAsync.value ??
        (syncState.dlqEvents.length + syncState.conflictEvents.length);
    final conflictCount = syncState.conflicts.length;
    final totalIssues = failedCount + conflictCount;

    if (totalIssues == 0) {
      return const SizedBox.shrink();
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: isDark
            ? Colors.amber.shade900.withValues(alpha: 0.9)
            : Colors.amber.shade50.withValues(alpha: 0.95),
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? Colors.amber.shade700.withValues(alpha: 0.5)
                : Colors.amber.shade200,
            width: 0.75,
          ),
        ),
      ),
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Row(
                children: [
                  Icon(
                    Icons.warning_amber_rounded,
                    color:
                        isDark ? Colors.amber.shade100 : Colors.amber.shade800,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '$totalIssues sync issue${totalIssues > 1 ? 's' : ''} require attention',
                      style: TextStyle(
                        fontFamily: 'PlusJakartaSans',
                        color: isDark
                            ? Colors.amber.shade100
                            : Colors.amber.shade900,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            Row(
              children: [
                _RetryButton(isDark: isDark),
                const SizedBox(width: 8),
                TextButton(
                  onPressed: () => context.push('/sync-status'),
                  style: TextButton.styleFrom(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    minimumSize: const Size(0, 28),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    foregroundColor: isDark ? Colors.amber.shade100 : Colors.amber.shade900,
                  ),
                  child: const Text(
                    'Details',
                    style: TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Backwards compatibility alias for existing usages
typedef FailedSyncBanner = SyncStatusBanner;

class _RetryButton extends ConsumerWidget {
  final bool isDark;

  const _RetryButton({required this.isDark});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isRetrying = ref.watch(_retryingProvider);

    return FilledButton(
      onPressed: isRetrying ? null : () => _retryFailedEvents(context, ref),
      style: FilledButton.styleFrom(
        backgroundColor: Colors.amber.shade700,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        minimumSize: const Size(0, 26),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(6),
        ),
        textStyle: const TextStyle(
          fontFamily: 'PlusJakartaSans',
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
      child: isRetrying
          ? const SizedBox(
              width: 12,
              height: 12,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            )
          : const Text('Retry'),
    );
  }

  Future<void> _retryFailedEvents(BuildContext context, WidgetRef ref) async {
    ref.read(_retryingProvider.notifier).state = true;

    try {
      await ref.read(syncStatusProvider.notifier).retryAll();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Retrying failed sync...'),
            behavior: SnackBarBehavior.floating,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Retry failed: $e'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      ref.read(_retryingProvider.notifier).state = false;
    }
  }
}

final _retryingProvider = StateProvider<bool>((ref) => false);