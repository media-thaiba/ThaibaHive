import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shimmer/shimmer.dart';
import 'package:thaibahive_mobile/app/capability_registry.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/core/services/network_service.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';
import 'package:thaibahive_mobile/features/media/data/media_outbox.dart';
import 'package:thaibahive_mobile/features/media/data/media_providers.dart';
import 'package:thaibahive_mobile/features/media/data/media_repository.dart';
import 'package:thaibahive_mobile/shared/widgets/error_widget.dart';
import 'package:thaibahive_mobile/shared/widgets/loading_widget.dart';

/// Media Screen - Dedicated tab for users with the `media.asset.view`
/// capability (see `lib/app/capability_registry.dart`).
/// Camera capture, gallery, upload outbox, album management.
class MediaScreen extends ConsumerStatefulWidget {
  const MediaScreen({super.key});

  @override
  ConsumerState<MediaScreen> createState() => _MediaScreenState();
}

class _MediaScreenState extends ConsumerState<MediaScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final role = authState.user?.role;
    final canCapture = hasCapability(role, 'media.asset.capture');
    final canUpload = hasCapability(role, 'media.asset.upload');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Media'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.photo_library_rounded), text: 'Gallery'),
            Tab(icon: Icon(Icons.camera_alt_rounded), text: 'Capture'),
            Tab(icon: Icon(Icons.cloud_upload_rounded), text: 'Outbox'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          const _GalleryTab(),
          _CaptureTab(canCapture: canCapture, canUpload: canUpload),
          const _OutboxTab(),
        ],
      ),
    );
  }
}

class _GalleryTab extends ConsumerWidget {
  const _GalleryTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final assetsAsync = ref.watch(mediaGalleryProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.read(mediaGalleryProvider.notifier).refresh(),
      child: assetsAsync.when(
        loading: () => const PageShimmer(),
        error: (e, _) => AppErrorWidget(
          message: 'Failed to load gallery: $e',
          onRetry: () => ref.invalidate(mediaGalleryProvider),
        ),
        data: (assets) {
          if (assets.isEmpty) {
            return const EmptyStateWidget(
              title: 'No Media',
              message: 'Your gallery is empty. Capture some moments!',
              icon: Icons.photo_library_rounded,
            );
          }
          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: assets.length,
            itemBuilder: (context, index) {
              final asset = assets[index];
              return _AssetThumbnail(asset: asset);
            },
          );
        },
      ),
    );
  }
}

class _AssetThumbnail extends StatelessWidget {
  const _AssetThumbnail({required this.asset});

  final MediaAssetModel asset;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final imageUrl = asset.thumbnailUrl ?? asset.fileUrl;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (imageUrl != null)
            Image.network(
              imageUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _placeholder(theme),
            )
          else
            _placeholder(theme),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.7),
                ],
              ),
            ),
          ),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    asset.name,
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    '${_formatSize(asset.fileSize)} • ${asset.mimeType.split('/').last.toUpperCase()}',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: Colors.white.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _placeholder(ThemeData theme) => Container(
        color: theme.colorScheme.surfaceContainerHighest,
        child: const Center(
          child: Icon(Icons.image_rounded, size: 48, color: Colors.grey),
        ),
      );

  String _formatSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

class _CaptureTab extends ConsumerStatefulWidget {
  const _CaptureTab({required this.canCapture, required this.canUpload});

  final bool canCapture;
  final bool canUpload;

  @override
  ConsumerState<_CaptureTab> createState() => _CaptureTabState();
}

class _CaptureTabState extends ConsumerState<_CaptureTab> {
  final ImagePicker _picker = ImagePicker();
  bool _isPicking = false;

  Future<void> _pickFromCamera() async {
    if (_isPicking) return;
    _isPicking = true;
    try {
      final xfile = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 85,
      );
      if (xfile != null && mounted) {
        await _enqueueFile(File(xfile.path), xfile.name);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Camera error: $e')),
        );
      }
    } finally {
      if (mounted) _isPicking = false;
    }
  }

  Future<void> _pickFromGallery() async {
    if (!widget.canUpload) return;
    if (_isPicking) return;
    _isPicking = true;
    try {
      final xfiles = await _picker.pickMultiImage(
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 85,
      );
      for (final xfile in xfiles) {
        if (!mounted) break;
        await _enqueueFile(File(xfile.path), xfile.name);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gallery error: $e')),
        );
      }
    } finally {
      if (mounted) _isPicking = false;
    }
  }

  Future<void> _enqueueFile(File file, String name) async {
    final store = ref.read(mediaOutboxStoreProvider);
    await store.enqueue(
      source: file,
      originalName: name,
      mimeType: _mimeFromExtension(name),
    );
    ref.read(mediaOutboxJobsProvider.notifier).load();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$name queued for upload')),
      );
    }
  }

  String _mimeFromExtension(String name) {
    final ext = name.split('.').last.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'mp4':
      case 'mov':
        return 'video/mp4';
      default:
        return 'application/octet-stream';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (!widget.canCapture) {
      return const EmptyStateWidget(
        title: 'Capture Unavailable',
        message: 'You do not have permission to capture media.',
        icon: Icons.block_rounded,
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.camera_alt_rounded,
              size: 64,
              color: theme.colorScheme.onPrimaryContainer,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Capture Moments',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Take photos and videos of campus events.\nAll captures go to the outbox for review.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          FilledButton.icon(
            onPressed: _isPicking ? null : _pickFromCamera,
            icon: const Icon(Icons.camera_alt_rounded),
            label: const Text('Open Camera'),
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: widget.canUpload && !_isPicking ? _pickFromGallery : null,
            icon: const Icon(Icons.photo_library_rounded),
            label: const Text('Pick from Gallery'),
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            ),
          ),
        ],
      ),
    );
  }
}

class _OutboxTab extends ConsumerStatefulWidget {
  const _OutboxTab();

  @override
  ConsumerState<_OutboxTab> createState() => _OutboxTabState();
}

class _OutboxTabState extends ConsumerState<_OutboxTab> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final jobs = ref.watch(mediaOutboxJobsProvider);
    final drainState = ref.watch(mediaDrainProvider);
    final isPaused = ref.watch(mediaOutboxStoreProvider).isPaused();

    if (jobs.isEmpty) {
      return const EmptyStateWidget(
        title: 'Outbox Empty',
        message: 'Captured media will appear here until uploaded.',
        icon: Icons.cloud_upload_rounded,
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        ref.read(mediaOutboxJobsProvider.notifier).load();
        await ref.read(mediaDrainProvider.notifier).drain(force: true);
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: jobs.length + (drainState.draining || isPaused ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == 0 && (drainState.draining || isPaused)) {
            return _buildStatusBanner(theme, drainState, isPaused);
          }
          final jobIndex = (drainState.draining || isPaused) ? index - 1 : index;
          return _JobTile(job: jobs[jobIndex]);
        },
      ),
    );
  }

  Widget _buildStatusBanner(
    ThemeData theme,
    MediaDrainState drainState,
    bool isPaused,
  ) {
    if (isPaused) {
      return Card(
        color: Colors.orange.withValues(alpha: 0.1),
        child: ListTile(
          leading: const Icon(Icons.pause_circle_rounded, color: Colors.orange),
          title: const Text('Upload Paused'),
          subtitle: const Text('Rate limited — will resume automatically'),
          trailing: TextButton(
            onPressed: () => ref.read(mediaOutboxJobsProvider.notifier).clearPause(),
            child: const Text('Resume'),
          ),
        ),
      );
    }
    if (drainState.draining) {
      return Card(
        color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
        child: ListTile(
          leading: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          title: const Text('Uploading...'),
          subtitle: drainState.lastSummary != null
              ? Text(
                  'Completed: ${drainState.lastSummary!.completed}, '
                  'Failed: ${drainState.lastSummary!.failed}, '
                  'Dead: ${drainState.lastSummary!.dead}',
                )
              : null,
        ),
      );
    }
    return const SizedBox.shrink();
  }
}

class _JobTile extends ConsumerWidget {
  const _JobTile({required this.job});

  final MediaJob job;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isTerminal = isMediaTerminal(job.status);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  job.mimeType.startsWith('video') ? Icons.videocam_rounded : Icons.photo_rounded,
                  color: theme.colorScheme.primary,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        job.name,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        '${_formatSize(job.size)} • ${_statusLabel(job.status)}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                _StatusChip(status: job.status),
              ],
            ),
            if (job.status == MediaJobStatus.uploading ||
                job.status == MediaJobStatus.hashing ||
                job.status == MediaJobStatus.verifying) ...[
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: job.progress.clamp(0.0, 1.0),
                minHeight: 4,
                borderRadius: BorderRadius.circular(2),
              ),
            ],
            if (job.errorMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                job.errorMessage!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (!isTerminal) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (job.status == MediaJobStatus.dead ||
                      job.status == MediaJobStatus.staged) ...[
                    TextButton.icon(
                      onPressed: () {
                        ref.read(mediaOutboxJobsProvider.notifier).retry(job.clientEventId);
                        ref.read(mediaDrainProvider.notifier).drain();
                      },
                      icon: const Icon(Icons.refresh_rounded, size: 18),
                      label: const Text('Retry'),
                    ),
                    const SizedBox(width: 8),
                  ],
                  TextButton.icon(
                    onPressed: () {
                      ref.read(mediaOutboxJobsProvider.notifier).discard(job.clientEventId);
                    },
                    icon: const Icon(Icons.delete_rounded, size: 18),
                    label: const Text('Discard'),
                    style: TextButton.styleFrom(
                      foregroundColor: theme.colorScheme.error,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  String _statusLabel(MediaJobStatus status) {
    switch (status) {
      case MediaJobStatus.staged:
        return 'Queued';
      case MediaJobStatus.hashing:
        return 'Hashing...';
      case MediaJobStatus.uploading:
        return 'Uploading...';
      case MediaJobStatus.verifying:
        return 'Verifying...';
      case MediaJobStatus.completed:
        return 'Done';
      case MediaJobStatus.dead:
        return 'Failed';
    }
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final MediaJobStatus status;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Color color;
    IconData icon;
    String label;

    switch (status) {
      case MediaJobStatus.staged:
        color = Colors.orange;
        icon = Icons.schedule_rounded;
        label = 'Queued';
      case MediaJobStatus.hashing:
        color = theme.colorScheme.primary;
        icon = Icons.memory_rounded;
        label = 'Hashing';
      case MediaJobStatus.uploading:
        color = theme.colorScheme.primary;
        icon = Icons.cloud_upload_rounded;
        label = 'Uploading';
      case MediaJobStatus.verifying:
        color = theme.colorScheme.primary;
        icon = Icons.verified_rounded;
        label = 'Verifying';
      case MediaJobStatus.completed:
        color = Colors.green;
        icon = Icons.check_circle_rounded;
        label = 'Done';
      case MediaJobStatus.dead:
        color = theme.colorScheme.error;
        icon = Icons.error_rounded;
        label = 'Failed';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}