import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/circulars_provider.dart';

class CircularsScreen extends ConsumerStatefulWidget {
  const CircularsScreen({super.key});

  @override
  ConsumerState<CircularsScreen> createState() => _CircularsScreenState();
}

class _CircularsScreenState extends ConsumerState<CircularsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(circularsProvider.notifier).loadCirculars());
  }

  Future<void> _openFile(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(circularsProvider);
    final notifier = ref.read(circularsProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Circulars',
      showBack: false,
      body: state.isLoading
          ? const ListShimmer()
          : state.error != null
              ? AppErrorWidget(
                  message: state.error!,
                  onRetry: () => notifier.loadCirculars(),
                )
              : state.circulars.isEmpty
                  ? const EmptyStateWidget(
                      message: 'No circulars',
                      icon: Icons.campaign_rounded)
                  : RefreshIndicator(
                      onRefresh: () => notifier.loadCirculars(),
                      child: ListView.builder(
                        itemCount: state.circulars.length,
                        itemBuilder: (_, i) {
                          final c = state.circulars[i];
                          final icon = _fileIcon(c.fileType ?? '');
                          return Card(
                            margin: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 4),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor:
                                    icon.$2.withValues(alpha: 0.2),
                                child: Icon(icon.$1,
                                    color: icon.$2, size: 24),
                              ),
                              title: Text(c.title,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600)),
                              subtitle: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  if (c.description != null)
                                    Text(c.description!,
                                        maxLines: 1,
                                        overflow:
                                            TextOverflow.ellipsis),
                                  Text(c.createdAt.toDisplayDate(),
                                      style: theme.textTheme.bodySmall),
                                ],
                              ),
                              trailing: IconButton(
                                icon: const Icon(
                                    Icons.download_rounded),
                                onPressed: () => _openFile(c.fileUrl),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }

  (IconData, Color) _fileIcon(String fileType) {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return (Icons.picture_as_pdf_rounded, Colors.red);
      case 'doc':
      case 'docx':
        return (Icons.description_rounded, Colors.blue);
      case 'xls':
      case 'xlsx':
        return (Icons.table_chart_rounded, Colors.green);
      case 'ppt':
      case 'pptx':
        return (Icons.slideshow_rounded, Colors.orange);
      case 'image':
      case 'jpg':
      case 'jpeg':
      case 'png':
        return (Icons.image_rounded, Colors.purple);
      default:
        return (Icons.insert_drive_file_rounded, Colors.grey);
    }
  }
}
