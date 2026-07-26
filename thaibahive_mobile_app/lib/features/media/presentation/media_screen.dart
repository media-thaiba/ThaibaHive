import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../../../shared/widgets/error_widget.dart';
import '../data/media_repository.dart';

class MediaScreen extends ConsumerStatefulWidget {
  const MediaScreen({super.key});

  @override
  ConsumerState<MediaScreen> createState() => _MediaScreenState();
}

class _MediaScreenState extends ConsumerState<MediaScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<MediaFolderModel> _folders = [];
  List<MediaAssetModel> _assets = [];
  String? _selectedFileType;
  String _searchQuery = '';
  bool _isGridView = true;

  @override
  void initState() {
    super.initState();
    _loadMediaData();
  }

  Future<void> _loadMediaData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(mediaRepositoryProvider);
      final folders = await repo.getFolders();
      final assets = await repo.getAssets(
        fileType: _selectedFileType,
        search: _searchQuery.isEmpty ? null : _searchQuery,
      );

      if (mounted) {
        setState(() {
          _folders = folders;
          _assets = assets;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  IconData _getFileIcon(String fileType) {
    switch (fileType) {
      case 'image':
        return Icons.image_rounded;
      case 'video':
        return Icons.movie_rounded;
      case 'audio':
        return Icons.audiotrack_rounded;
      default:
        return Icons.insert_drive_file_rounded;
    }
  }

  String _formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Media Library',
      showBack: true,
      actions: [
        IconButton(
          icon: Icon(_isGridView ? Icons.view_list_rounded : Icons.grid_view_rounded),
          onPressed: () => setState(() => _isGridView = !_isGridView),
          tooltip: _isGridView ? 'List View' : 'Grid View',
        ),
      ],
      body: RefreshIndicator(
        onRefresh: _loadMediaData,
        child: Column(
          children: [
            // Search and Filter Bar
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'Search media…',
                        prefixIcon: const Icon(Icons.search_rounded),
                        isDense: true,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onChanged: (val) {
                        _searchQuery = val;
                        _loadMediaData();
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  DropdownButton<String?>(
                    value: _selectedFileType,
                    hint: const Text('Filter'),
                    items: const [
                      DropdownMenuItem(value: null, child: Text('All')),
                      DropdownMenuItem(value: 'image', child: Text('Images')),
                      DropdownMenuItem(value: 'video', child: Text('Videos')),
                      DropdownMenuItem(value: 'audio', child: Text('Audio')),
                      DropdownMenuItem(value: 'document', child: Text('Docs')),
                    ],
                    onChanged: (val) {
                      setState(() => _selectedFileType = val);
                      _loadMediaData();
                    },
                  ),
                ],
              ),
            ),

            // Main Content Body
            Expanded(
              child: _isLoading
                  ? const LoadingWidget()
                  : _errorMessage != null
                      ? AppErrorWidget(
                          message: _errorMessage!,
                          onRetry: _loadMediaData,
                        )
                      : (_folders.isEmpty && _assets.isEmpty)
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.folder_open_rounded, size: 64, color: theme.disabledColor),
                                  const SizedBox(height: 12),
                                  Text('No media found', style: theme.textTheme.titleMedium),
                                ],
                              ),
                            )
                          : ListView(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              children: [
                                if (_folders.isNotEmpty) ...[
                                  Text('FOLDERS', style: theme.textTheme.labelSmall),
                                  const SizedBox(height: 8),
                                  GridView.builder(
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 2,
                                      childAspectRatio: 2.8,
                                      crossAxisSpacing: 8,
                                      mainAxisSpacing: 8,
                                    ),
                                    itemCount: _folders.length,
                                    itemBuilder: (context, index) {
                                      final folder = _folders[index];
                                      return Card(
                                        child: InkWell(
                                          borderRadius: BorderRadius.circular(12),
                                          onTap: () {},
                                          child: Padding(
                                            padding: const EdgeInsets.all(8),
                                            child: Row(
                                              children: [
                                                Icon(Icons.folder_rounded, color: theme.primaryColor),
                                                const SizedBox(width: 8),
                                                Expanded(
                                                  child: Text(
                                                    folder.name,
                                                    overflow: TextOverflow.ellipsis,
                                                    style: theme.textTheme.bodyMedium,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                  const SizedBox(height: 16),
                                ],

                                if (_assets.isNotEmpty) ...[
                                  Text('FILES', style: theme.textTheme.labelSmall),
                                  const SizedBox(height: 8),
                                  if (_isGridView)
                                    GridView.builder(
                                      shrinkWrap: true,
                                      physics: const NeverScrollableScrollPhysics(),
                                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                        crossAxisCount: 2,
                                        childAspectRatio: 0.9,
                                        crossAxisSpacing: 8,
                                        mainAxisSpacing: 8,
                                      ),
                                      itemCount: _assets.length,
                                      itemBuilder: (context, index) {
                                        final asset = _assets[index];
                                        return Card(
                                          clipBehavior: Clip.antiAlias,
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.stretch,
                                            children: [
                                              Expanded(
                                                child: asset.thumbnailUrl != null
                                                    ? CachedNetworkImage(
                                                        imageUrl: asset.thumbnailUrl!,
                                                        fit: BoxFit.cover,
                                                        placeholder: (_, __) => const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                                                        errorWidget: (_, __, ___) => Icon(_getFileIcon(asset.fileType), size: 36),
                                                      )
                                                    : Container(
                                                        color: theme.colorScheme.surfaceContainerHighest,
                                                        child: Icon(_getFileIcon(asset.fileType), size: 36, color: theme.hintColor),
                                                      ),
                                              ),
                                              Padding(
                                                padding: const EdgeInsets.all(8),
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      asset.name,
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                      style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold),
                                                    ),
                                                    Text(_formatBytes(asset.fileSize), style: theme.textTheme.bodySmall),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      },
                                    )
                                  else
                                    ListView.builder(
                                      shrinkWrap: true,
                                      physics: const NeverScrollableScrollPhysics(),
                                      itemCount: _assets.length,
                                      itemBuilder: (context, index) {
                                        final asset = _assets[index];
                                        return ListTile(
                                          leading: Icon(_getFileIcon(asset.fileType)),
                                          title: Text(asset.name),
                                          subtitle: Text(_formatBytes(asset.fileSize)),
                                          trailing: const Icon(Icons.chevron_right_rounded),
                                          onTap: () {},
                                        );
                                      },
                                    ),
                                ],
                              ],
                            ),
            ),
          ],
        ),
      ),
    );
  }
}
