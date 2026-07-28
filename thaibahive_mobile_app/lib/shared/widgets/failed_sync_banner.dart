import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';
import 'package:thaibahive_mobile/core/services/offline_sync_service.dart';

/// Provider for tracking failed events count
final failedEventsCountProvider = StreamProvider<int>((ref) async* {
  // Initial value
  yield offlineQueue.getFailedEvents().length;
  
  // Listen for changes - we use a periodic timer to poll for changes
  // since Hive doesn't have built-in streams for box changes
  final stream = Stream.periodic(const Duration(seconds: 2), (_) {
    return offlineQueue.getFailedEvents().length;
  });
  
  await for (final count in stream) {
    yield count;
  }
});

class FailedSyncBanner extends ConsumerWidget {
  const FailedSyncBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final failedCount = ref.watch(failedEventsCountProvider);
    
    return failedCount.when(
      data: (count) {
        if (count == 0) {
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
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
          child: SafeArea(
            bottom: false,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.warning_amber_rounded,
                  color: isDark ? Colors.amber.shade100 : Colors.amber.shade800,
                  size: 14,
                ),
                const SizedBox(width: 12),
                Text(
                  '⚠️ $count action${count > 1 ? 's' : ''} failed to sync',
                  style: TextStyle(
                    fontFamily: 'PlusJakartaSans',
                    color: isDark ? Colors.amber.shade100 : Colors.amber.shade900,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(width: 16),
                _RetryButton(isDark: isDark),
              ],
            ),
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}

class _RetryButton extends ConsumerWidget {
  final bool isDark;
  
  const _RetryButton({required this.isDark});
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isRetrying = ref.watch(_retryingProvider);
    
    return FilledButton(
      onPressed: isRetrying ? null : () => _retryFailedEvents(context, ref),
      style: FilledButton.styleFrom(
        backgroundColor: isDark ? Colors.amber.shade700 : Colors.amber.shade700,
        foregroundColor: isDark ? Colors.black : Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        minimumSize: const Size(0, 28),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(6),
        ),
        textStyle: const TextStyle(
          fontFamily: 'PlusJakartaSans',
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
      child: isRetrying
          ? const SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            )
          : const Text('Retry Now'),
    );
  }
  
  Future<void> _retryFailedEvents(BuildContext context, WidgetRef ref) async {
    ref.read(_retryingProvider.notifier).state = true;
    
    try {
      await offlineSyncService.retryFailedEvents();
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