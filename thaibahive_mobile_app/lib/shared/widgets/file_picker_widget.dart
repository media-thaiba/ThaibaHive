import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/services/file_upload_service.dart';
import 'package:thaibahive_mobile/shared/widgets/error_widget.dart';

class FilePickerWidget extends ConsumerStatefulWidget {
  final List<UploadedFile> selectedFiles;
  final ValueChanged<List<UploadedFile>> onFilesChanged;
  final int maxFiles;
  final bool allowMultiple;

  const FilePickerWidget({
    super.key,
    this.selectedFiles = const [],
    required this.onFilesChanged,
    this.maxFiles = 5,
    this.allowMultiple = true,
  });

  @override
  ConsumerState<FilePickerWidget> createState() => _FilePickerWidgetState();
}

class _FilePickerWidgetState extends ConsumerState<FilePickerWidget> {
  bool _isUploading = false;
  String? _error;

  static const _allowedExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'webp',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt',
  ];

  static const _maxSizeBytes = 2 * 1024 * 1024 * 1024; // 2GB

  Future<void> _pickFiles() async {
    final remaining = widget.maxFiles - widget.selectedFiles.length;
    if (remaining <= 0) return;

    try {
      final result = await FilePicker.platform.pickFiles(
        allowMultiple: widget.allowMultiple && remaining > 1,
        type: FileType.custom,
        allowedExtensions: _allowedExtensions,
      );

      if (result == null || result.files.isEmpty) return;

      final files = result.files.take(remaining).toList();
      final oversized = files.where((f) => f.size > _maxSizeBytes).toList();

      if (oversized.isNotEmpty) {
        setState(() {
          _error = '${oversized.first.name} exceeds 2GB limit';
        });
        return;
      }

      await _uploadFiles(files);
    } catch (e) {
      setState(() => _error = 'Failed to pick files: $e');
    }
  }

  Future<void> _uploadFiles(List<PlatformFile> platformFiles) async {
    setState(() {
      _isUploading = true;
      _error = null;
    });

    try {
      final uploadService = ref.read(fileUploadServiceProvider);
      final uploaded = <UploadedFile>[];

      for (final pf in platformFiles) {
        if (pf.path == null) continue;
        final file = File(pf.path!);
        final result = await uploadService.uploadFile(file);
        uploaded.add(result);
      }

      final allFiles = [...widget.selectedFiles, ...uploaded];
      widget.onFilesChanged(allFiles);
    } catch (e) {
      setState(() => _error = 'Upload failed: $e');
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  void _removeFile(int index) {
    final updated = List<UploadedFile>.from(widget.selectedFiles);
    updated.removeAt(index);
    widget.onFilesChanged(updated);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.selectedFiles.isNotEmpty) ...[
          ...widget.selectedFiles.asMap().entries.map((entry) {
            final i = entry.key;
            final file = entry.value;
            return _FileTile(
              file: file,
              onRemove: () => _removeFile(i),
            );
          }),
          const SizedBox(height: 8),
        ],
        if (_error != null) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              _error!,
              style: TextStyle(color: theme.colorScheme.error, fontSize: 12),
            ),
          ),
        ],
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _isUploading
                    ? null
                    : widget.selectedFiles.length >= widget.maxFiles
                        ? null
                        : _pickFiles,
                icon: _isUploading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.attach_file_rounded, size: 18),
                label: Text(
                  _isUploading
                      ? 'Uploading...'
                      : 'Attach files (${widget.selectedFiles.length}/${widget.maxFiles})',
                ),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _FileTile extends StatelessWidget {
  final UploadedFile file;
  final VoidCallback onRemove;

  const _FileTile({required this.file, required this.onRemove});

  IconData _iconForType(String type) {
    if (type.startsWith('image/')) return Icons.image_rounded;
    if (type == 'application/pdf') return Icons.picture_as_pdf_rounded;
    if (type.contains('word') || type.contains('document')) {
      return Icons.description_rounded;
    }
    if (type.contains('excel') || type.contains('sheet')) {
      return Icons.table_chart_rounded;
    }
    return Icons.insert_drive_file_rounded;
  }

  String _formatSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Card(
        margin: EdgeInsets.zero,
        child: ListTile(
          dense: true,
          leading: Icon(
            _iconForType(file.type),
            color: theme.colorScheme.primary,
          ),
          title: Text(
            file.filename,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall,
          ),
          subtitle: Text(
            _formatSize(file.size),
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
              fontSize: 11,
            ),
          ),
          trailing: IconButton(
            icon: const Icon(Icons.close_rounded, size: 18),
            onPressed: onRemove,
            visualDensity: VisualDensity.compact,
          ),
        ),
      ),
    );
  }
}
