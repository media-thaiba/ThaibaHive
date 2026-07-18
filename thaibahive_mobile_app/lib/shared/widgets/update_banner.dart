import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/update_provider.dart';
import '../../core/services/update_service.dart';

class UpdateBanner extends ConsumerStatefulWidget {
  final UpdateInfo info;
  final UpdateDownloadState state;
  final double progress;

  const UpdateBanner({
    super.key,
    required this.info,
    required this.state,
    required this.progress,
  });

  @override
  ConsumerState<UpdateBanner> createState() => _UpdateBannerState();
}

class _UpdateBannerState extends ConsumerState<UpdateBanner> {
  bool _showReleaseNotes = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isDownloading = widget.state == UpdateDownloadState.downloading;
    final isDownloaded = widget.state == UpdateDownloadState.downloaded;
    final isInstalling = widget.state == UpdateDownloadState.installing;

    final List<String> bulletPoints = widget.info.releaseNotes
        .replaceAll(r'\n', '\n')
        .split('\n')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .map((s) => s.startsWith('•') ? s.substring(1).trim() : s)
        .toList();

    return Card(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark ? const Color(0xFF451A03).withValues(alpha: 0.5) : const Color(0xFFFDE68A),
          width: 1,
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: isDark
                ? [const Color(0xFF78350F).withValues(alpha: 0.85), const Color(0xFF451A03).withValues(alpha: 0.9)]
                : [const Color(0xFFFFFBEB), const Color(0xFFFEF3C7)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: isDark ? 0.25 : 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.rocket_launch_rounded,
                    color: Color(0xFFD97706),
                    size: 18,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Update Available — v${widget.info.latestVersion}',
                        style: TextStyle(
                          color: isDark ? Colors.white : const Color(0xFF78350F),
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isDownloading
                            ? 'Downloading system resources...'
                            : isDownloaded
                                ? 'Update downloaded successfully!'
                                : isInstalling
                                    ? 'Installing update package...'
                                    : 'Tap "What\'s New" to see changes.',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: isDark ? const Color(0xFFFCD34D).withValues(alpha: 0.8) : const Color(0xFF92400E),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                if (!isDownloading && !isInstalling && bulletPoints.isNotEmpty)
                  TextButton(
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    onPressed: () => setState(() => _showReleaseNotes = !_showReleaseNotes),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _showReleaseNotes ? 'COLLAPSE' : "WHAT'S NEW",
                          style: const TextStyle(
                            color: Color(0xFFD97706),
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(width: 2),
                        Icon(
                          _showReleaseNotes ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                          color: const Color(0xFFD97706),
                          size: 14,
                        ),
                      ],
                    ),
                  ),
                const SizedBox(width: 8),
                if (!isDownloading && !isInstalling)
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD97706),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    onPressed: () {
                      if (isDownloaded) {
                        ref.read(updateStateProvider.notifier).installUpdate();
                      } else {
                        ref.read(updateStateProvider.notifier).downloadUpdate(widget.info.downloadUrl);
                      }
                    },
                    child: Text(
                      isDownloaded ? 'INSTALL' : 'UPDATE',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ),
                if (isDownloading)
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Color(0xFFD97706), size: 18),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () {
                      ref.read(updateStateProvider.notifier).cancelDownload();
                    },
                  ),
              ],
            ),
            if (isDownloading) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: widget.progress,
                        backgroundColor: const Color(0xFFD97706).withValues(alpha: 0.15),
                        valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFD97706)),
                        minHeight: 5,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${(widget.progress * 100).toInt()}%',
                    style: TextStyle(
                      color: isDark ? Colors.white : const Color(0xFF78350F),
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ],
            if (_showReleaseNotes && bulletPoints.isNotEmpty && !isDownloading && !isInstalling) ...[
              const SizedBox(height: 8),
              const Divider(
                color: Color(0xFFFDE68A),
                thickness: 0.5,
                height: 12,
              ),
              ...bulletPoints.map((point) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 2.0),
                      child: Icon(
                        Icons.check_circle_outline_rounded,
                        color: Color(0xFFD97706),
                        size: 12,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        point,
                        style: TextStyle(
                          color: isDark ? Colors.white.withValues(alpha: 0.9) : const Color(0xFF78350F),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          height: 1.3,
                        ),
                      ),
                    ),
                  ],
                ),
              )),
            ],
          ],
        ),
      ),
    );
  }
}
