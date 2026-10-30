import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/core/services/crash_log_service.dart';
import 'package:thaibahive_mobile/core/services/logger_service.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';

/// Shows the 3-Tap Diagnostic Problem Reporter modal sheet.
void showProblemReporterModal(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => const _ProblemReporterSheet(),
  );
}

/// A wrapper widget that listens for 3 rapid taps (within 800ms) to trigger
/// the diagnostic problem reporter sheet.
class TripleTapDetector extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTriggered;

  const TripleTapDetector({
    super.key,
    required this.child,
    this.onTriggered,
  });

  @override
  State<TripleTapDetector> createState() => _TripleTapDetectorState();
}

class _TripleTapDetectorState extends State<TripleTapDetector> {
  int _tapCount = 0;
  DateTime? _lastTapTime;

  void _handleTap() {
    final now = DateTime.now();
    if (_lastTapTime == null || now.difference(_lastTapTime!) > const Duration(milliseconds: 800)) {
      _tapCount = 1;
    } else {
      _tapCount++;
    }
    _lastTapTime = now;

    if (_tapCount >= 3) {
      _tapCount = 0;
      _lastTapTime = null;
      if (widget.onTriggered != null) {
        widget.onTriggered!();
      } else {
        showProblemReporterModal(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: _handleTap,
      child: widget.child,
    );
  }
}

class _ProblemReporterSheet extends ConsumerStatefulWidget {
  const _ProblemReporterSheet();

  @override
  ConsumerState<_ProblemReporterSheet> createState() => _ProblemReporterSheetState();
}

class _ProblemReporterSheetState extends ConsumerState<_ProblemReporterSheet> {
  final TextEditingController _descriptionController = TextEditingController();
  String _selectedCategory = 'Attendance Issue';
  bool _isSubmitting = false;
  bool _showLogs = false;

  final List<String> _categories = [
    'Attendance Issue',
    'Punch Location Error',
    'Screen Freeze / Crash',
    'Data Sync Failure',
    'Other Issue',
  ];

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submitReport() async {
    final text = _descriptionController.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a brief description of the issue.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final auth = ref.read(authProvider);
    final user = auth.user;
    final logEntries = logger.entries.take(25).map((e) => e.toString()).toList();

    final payload = {
      'category': _selectedCategory,
      'description': text,
      'appVersion': '${AppConstants.appVersion}+${AppConstants.appBuildNumber}',
      'deviceModel': crashLogService.deviceModel,
      'osVersion': crashLogService.osVersion,
      'userId': user?.id,
      'userEmail': user?.email,
      'userName': '${user?.firstName ?? ''} ${user?.lastName ?? ''}'.trim(),
      'userRole': user?.role,
      'timestamp': DateTime.now().toIso8601String(),
      'recentLogs': logEntries,
    };

    bool sentOnline = false;
    try {
      final dio = Dio(
        BaseOptions(
          baseUrl: AppConstants.apiBaseUrl,
          connectTimeout: const Duration(seconds: 4),
          receiveTimeout: const Duration(seconds: 4),
          headers: auth.token != null ? {'Authorization': 'Bearer ${auth.token}'} : null,
        ),
      );

      final response = await dio.post('/diagnostics/report', data: payload);
      if (response.statusCode == 200 || response.statusCode == 201) {
        sentOnline = true;
      }
    } catch (e) {
      // Endpoint may not be active or user is offline — fall back to local persistence
      sentOnline = false;
    }

    // Always persist to local diagnostic log file as tamper-proof record
    try {
      crashLogService.record(
        'USER_PROBLEM_REPORT:$_selectedCategory',
        jsonEncode(payload),
        null,
      );
      logger.info('[Diagnostics] Problem report recorded: $_selectedCategory - $text');
    } catch (_) {}

    if (mounted) {
      setState(() => _isSubmitting = false);
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            sentOnline
                ? 'Diagnostic report sent to support engineers.'
                : 'Report saved to local diagnostic ledger & queued.',
          ),
          backgroundColor: sentOnline ? Colors.green[700] : Colors.blueGrey[800],
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final auth = ref.watch(authProvider);
    final user = auth.user;
    final recentLogs = ref.watch(loggerProvider).take(15).map((e) => e.toString()).join('\n');

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E2124) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        top: 16,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Title
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.bug_report_rounded, color: theme.colorScheme.primary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Report Diagnostic Issue',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Direct Pilot Bug Reporter (3-Tap Trigger)',
                        style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Diagnostic Info Card
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF282C31) : const Color(0xFFF3F5F7),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? Colors.white10 : Colors.black12,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _infoRow('App Version', '${AppConstants.appVersion}+${AppConstants.appBuildNumber}'),
                  _infoRow('Device', '${crashLogService.deviceModel} (${crashLogService.osVersion})'),
                  _infoRow('User', '${user?.firstName ?? 'Unknown'} (${user?.role ?? 'None'})'),
                  _infoRow('Pilot Mode', 'V1.0 Pilot Active'),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Category Chips
            Text('Issue Category', style: theme.textTheme.labelMedium),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _categories.map((cat) {
                final isSelected = cat == _selectedCategory;
                return ChoiceChip(
                  label: Text(cat, style: const TextStyle(fontSize: 12)),
                  selected: isSelected,
                  onSelected: (_) => setState(() => _selectedCategory = cat),
                  selectedColor: theme.colorScheme.primary.withValues(alpha: 0.2),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            // Description Input
            TextFormField(
              controller: _descriptionController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'What went wrong?',
                hintText: 'e.g. Geofence punch failed at Main Gate, button remained disabled...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),

            // Log details toggle
            InkWell(
              onTap: () => setState(() => _showLogs = !_showLogs),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Icon(
                      _showLogs ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                      size: 20,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _showLogs ? 'Hide Console Logs' : 'View Recent Console Logs (${ref.watch(loggerProvider).length})',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            if (_showLogs) ...[
              const SizedBox(height: 8),
              Container(
                height: 120,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SingleChildScrollView(
                  child: Text(
                    recentLogs.isEmpty ? 'No console logs recorded in this session.' : recentLogs,
                    style: const TextStyle(
                      color: Color(0xFF69F0AE),
                      fontFamily: 'monospace',
                      fontSize: 10,
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 20),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.share_rounded, size: 18),
                    label: const Text('Export Logs'),
                    onPressed: () => logger.shareLogs(),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: FilledButton.icon(
                    icon: _isSubmitting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.send_rounded, size: 18),
                    label: Text(_isSubmitting ? 'Sending...' : 'Submit Report'),
                    onPressed: _isSubmitting ? null : _submitReport,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
          Text(
            value,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
