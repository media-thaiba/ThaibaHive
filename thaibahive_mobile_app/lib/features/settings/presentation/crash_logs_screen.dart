import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:intl/intl.dart';
import 'package:thaibahive_mobile/core/services/crash_log_service.dart';
import 'package:thaibahive_mobile/core/services/logger_service.dart';

class CrashLogsScreen extends ConsumerStatefulWidget {
  const CrashLogsScreen({super.key});

  @override
  ConsumerState<CrashLogsScreen> createState() => _CrashLogsScreenState();
}

class _CrashLogsScreenState extends ConsumerState<CrashLogsScreen> with SingleTickerProviderStateMixin {
  List<CrashLogFile> _logs = [];
  bool _isLoading = true;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(crashLogsProvider.notifier).state = crashLogService.listLogs();
    });
    _loadLogs();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadLogs() {
    setState(() {
      _isLoading = true;
    });
    try {
      final logs = crashLogService.listLogs();
      setState(() {
        _logs = logs;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _deleteLog(CrashLogFile logFile) {
    try {
      crashLogService.deleteLog(logFile.file.path);
      _loadLogs();
      ref.read(crashLogsProvider.notifier).state = crashLogService.listLogs();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Crash log deleted')),
      );
    } catch (_) {}
  }

  void _clearAllLogs() {
    showDialog(
      context: context,
      builder: (context) {
        final theme = Theme.of(context);
        return AlertDialog(
          backgroundColor: theme.colorScheme.surface,
          title: Text('Clear All Logs?', style: TextStyle(color: theme.colorScheme.onSurface)),
          content: Text(
            'This will permanently delete all crash logs from this device.',
            style: TextStyle(color: theme.colorScheme.onSurface.withValues(alpha: 0.7)),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Cancel', style: TextStyle(color: theme.colorScheme.onSurface.withValues(alpha: 0.5))),
            ),
            TextButton(
              onPressed: () {
                crashLogService.deleteAll();
                Navigator.pop(context);
                _loadLogs();
                ref.read(crashLogsProvider.notifier).state = [];
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('All crash logs cleared')),
                );
              },
              child: Text('Clear All', style: TextStyle(color: theme.colorScheme.error)),
            ),
          ],
        );
      },
    );
  }

  void _shareLog(CrashLogFile logFile) {
    try {
      final content = crashLogService.readLog(logFile.file.path);
      Share.share(
        content,
        subject: 'ThaibaHive Crash Log - ${DateFormat('yyyy-MM-dd HH:mm').format(logFile.timestamp)}',
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to share log: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.surface,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: theme.colorScheme.onSurface),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Diagnostics & Logs',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface),
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF1a8a3e),
          unselectedLabelColor: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          indicatorColor: const Color(0xFF1a8a3e),
          tabs: const [
            Tab(text: 'Crash Reports'),
            Tab(text: 'Console Logs'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Crash Reports
          _isLoading
              ? Center(child: CircularProgressIndicator(color: theme.colorScheme.primary))
              : _logs.isEmpty
                  ? _buildEmptyState(theme)
                  : _buildLogsList(theme),

          // Tab 2: Console Logs
          _buildConsoleLogsView(theme),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.check_circle_outline_rounded,
              size: 64,
              color: const Color(0xFF10B981).withValues(alpha: 0.5),
            ),
            const SizedBox(height: 24),
            Text(
              'No Crash Reports 🎉',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface),
            ),
            const SizedBox(height: 8),
            Text(
              'Your app has been running smoothly without any unhandled exceptions.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: theme.colorScheme.onSurface.withValues(alpha: 0.6)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLogsList(ThemeData theme) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: theme.colorScheme.error,
        onPressed: _clearAllLogs,
        icon: const Icon(Icons.delete_sweep_rounded, color: Colors.white),
        label: const Text('Clear All Reports', style: TextStyle(color: Colors.white)),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
        itemCount: _logs.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final log = _logs[index];
          final sizeKb = (log.sizeBytes / 1024).toStringAsFixed(1);
          final dateStr = DateFormat('EEE, MMM d, yyyy - h:mm a').format(log.timestamp);

          String tag = 'UNKNOWN';
          Color tagColor = theme.colorScheme.onSurface.withValues(alpha: 0.6);
          try {
            final content = crashLogService.readLog(log.file.path);
            final decoded = jsonDecode(content) as Map<String, dynamic>;
            tag = decoded['tag']?.toString() ?? 'ERROR';
          } catch (_) {}

          if (tag.contains('RENDER')) {
            tagColor = Colors.indigo;
          } else if (tag.contains('FLUTTER')) {
            tagColor = theme.colorScheme.error;
          } else if (tag.contains('ASYNC')) {
            tagColor = Colors.amber;
          } else if (tag.contains('ZONE')) {
            tagColor = Colors.purple;
          }

          return Dismissible(
            key: Key(log.file.path),
            direction: DismissDirection.endToStart,
            background: Container(
              alignment: Alignment.centerRight,
              padding: const EdgeInsets.only(right: 20.0),
              decoration: BoxDecoration(
                color: theme.colorScheme.error,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.delete_outline_rounded, color: Colors.white),
            ),
            onDismissed: (_) => _deleteLog(log),
            child: Container(
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: theme.dividerColor.withValues(alpha: 0.12)),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                title: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: tagColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        tag,
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          color: tagColor,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '$sizeKb KB',
                      style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurface.withValues(alpha: 0.6)),
                    ),
                  ],
                ),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(
                    dateStr,
                    style: TextStyle(fontSize: 13, color: theme.colorScheme.onSurface, fontWeight: FontWeight.w500),
                  ),
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.share_rounded, color: Colors.amber, size: 20),
                      onPressed: () => _shareLog(log),
                    ),
                    Icon(Icons.chevron_right_rounded, color: theme.colorScheme.onSurface.withValues(alpha: 0.6), size: 16),
                  ],
                ),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => CrashLogDetailScreen(logFile: log),
                    ),
                  ).then((_) => _loadLogs());
                },
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildConsoleLogsView(ThemeData theme) {
    final consoleLogs = ref.watch(loggerProvider);

    return Scaffold(
      floatingActionButton: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton.extended(
            heroTag: 'clearConsoleLogs',
            backgroundColor: theme.colorScheme.surface,
            foregroundColor: theme.colorScheme.onSurface,
            onPressed: () {
              ref.read(loggerServiceProvider).clear();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Console logs cleared')),
              );
            },
            icon: const Icon(Icons.clear_all_rounded),
            label: const Text('Clear'),
          ),
          const SizedBox(width: 12),
          FloatingActionButton.extended(
            heroTag: 'shareConsoleLogs',
            backgroundColor: const Color(0xFF1a8a3e),
            foregroundColor: Colors.white,
            onPressed: () async {
              try {
                await ref.read(loggerServiceProvider).shareLogs();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed to share logs: $e')),
                );
              }
            },
            icon: const Icon(Icons.share_rounded, color: Colors.white),
            label: const Text('Share Log File'),
          ),
        ],
      ),
      body: consoleLogs.isEmpty
          ? Center(
              child: Text(
                'No console logs captured yet.',
                style: TextStyle(color: theme.colorScheme.onSurface.withValues(alpha: 0.6)),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
              itemCount: consoleLogs.length,
              itemBuilder: (context, index) {
                final entry = consoleLogs[index];
                Color color = theme.colorScheme.onSurface.withValues(alpha: 0.75);
                switch (entry.level) {
                  case LogLevel.info:
                    color = theme.colorScheme.onSurface.withValues(alpha: 0.85);
                    break;
                  case LogLevel.warning:
                    color = Colors.orange;
                    break;
                  case LogLevel.error:
                    color = theme.colorScheme.error;
                    break;
                  case LogLevel.sync:
                    color = Colors.blue;
                    break;
                }

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Text(
                    entry.toString(),
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: color,
                    ),
                  ),
                );
              },
            ),
    );
  }
}

class CrashLogDetailScreen extends ConsumerWidget {
  final CrashLogFile logFile;
  const CrashLogDetailScreen({super.key, required this.logFile});

  void _share(WidgetRef ref, BuildContext context) {
    try {
      final content = crashLogService.readLog(logFile.file.path);
      Share.share(
        content,
        subject: 'ThaibaHive Crash Log - ${DateFormat('yyyy-MM-dd HH:mm').format(logFile.timestamp)}',
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to share log: $e')),
      );
    }
  }

  void _delete(WidgetRef ref, BuildContext context) {
    try {
      crashLogService.deleteLog(logFile.file.path);
      ref.read(crashLogsProvider.notifier).state = crashLogService.listLogs();
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Crash log deleted')),
      );
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final content = crashLogService.readLog(logFile.file.path);

    Map<String, dynamic> decoded = {};
    try {
      decoded = jsonDecode(content) as Map<String, dynamic>;
    } catch (_) {}

    final tag = decoded['tag']?.toString() ?? 'ERROR';
    final appVersion = decoded['appVersion']?.toString() ?? 'unknown';
    final osVersion = decoded['osVersion']?.toString() ?? 'unknown';
    final deviceModel = decoded['deviceModel']?.toString() ?? 'unknown';
    final error = decoded['error']?.toString() ?? 'No error message';
    final stackTrace = decoded['stackTrace']?.toString() ?? 'No stack trace';

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.surface,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: theme.colorScheme.onSurface),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Log Details',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_rounded, color: Colors.amber),
            onPressed: () => _share(ref, context),
          ),
          IconButton(
            icon: Icon(Icons.delete_outline_rounded, color: theme.colorScheme.error),
            onPressed: () => _delete(ref, context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: theme.dividerColor.withValues(alpha: 0.12)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildMetadataRow(theme, 'Tag', tag),
                  const Divider(height: 20),
                  _buildMetadataRow(theme, 'Time', DateFormat('yyyy-MM-dd HH:mm:ss').format(logFile.timestamp)),
                  const Divider(height: 20),
                  _buildMetadataRow(theme, 'App Version', appVersion),
                  const Divider(height: 20),
                  _buildMetadataRow(theme, 'Device', deviceModel),
                  const Divider(height: 20),
                  _buildMetadataRow(theme, 'OS', osVersion),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'ERROR MESSAGE',
              style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w900, color: theme.colorScheme.onSurface.withValues(alpha: 0.6)),
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.brightness == Brightness.dark ? Colors.black38 : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: theme.dividerColor.withValues(alpha: 0.12)),
              ),
              child: Text(
                error,
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: theme.colorScheme.error,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'STACK TRACE',
              style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w900, color: theme.colorScheme.onSurface.withValues(alpha: 0.6)),
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.brightness == Brightness.dark ? Colors.black38 : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: theme.dividerColor.withValues(alpha: 0.12)),
              ),
              child: SelectableText(
                stackTrace,
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 10,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.8),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetadataRow(ThemeData theme, String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: theme.colorScheme.onSurface.withValues(alpha: 0.6), fontSize: 13, fontWeight: FontWeight.w500)),
        Text(value, style: TextStyle(color: theme.colorScheme.onSurface, fontSize: 13, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
