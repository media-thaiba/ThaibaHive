import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/extensions.dart';
import '../../../models/recognition_model.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/recognition_provider.dart';

class RecognitionScreen extends ConsumerStatefulWidget {
  const RecognitionScreen({super.key});

  @override
  ConsumerState<RecognitionScreen> createState() =>
      _RecognitionScreenState();
}

class _RecognitionScreenState extends ConsumerState<RecognitionScreen> {
  final _types = ['all', 'kudos', 'birthday', 'anniversary'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final recogAsync = ref.watch(recognitionListProvider);
    final selectedType = ref.watch(recognitionTypeProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Recognition')),
      body: Column(
        children: [
          Container(
            color: theme.colorScheme.surface,
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: _types.map((type) {
                  final label = type == 'all' ? 'All' : type;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(
                          '${label[0].toUpperCase()}${label.substring(1)}'),
                      selected: selectedType == type,
                      onSelected: (_) {
                        ref
                            .read(recognitionTypeProvider.notifier)
                            .state = type;
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          Expanded(
            child: recogAsync.when(
              data: (recognitions) {
                if (recognitions.isEmpty) {
                  return const EmptyStateWidget(
                    icon: Icons.emoji_events_rounded,
                    title: 'No Recognitions',
                    message: 'No recognitions to show yet.',
                  );
                }
                return RefreshIndicator(
                  onRefresh: () =>
                      ref.read(recognitionListProvider.notifier).refresh(),
                  child: ListView.builder(
                    padding: const EdgeInsets.only(top: 8, bottom: 80),
                    itemCount: recognitions.length,
                    itemBuilder: (_, i) => _RecognitionCard(
                      recognition: recognitions[i],
                    ),
                  ),
                );
              },
              loading: () => const PageShimmer(),
              error: (e, _) => AppErrorWidget(
                message: e.toString(),
                onRetry: () =>
                    ref.read(recognitionListProvider.notifier).refresh(),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showGiveKudosDialog(context),
        child: const Icon(Icons.add_rounded),
      ),
    );
  }

  IconData _typeIcon(String type) {
    switch (type) {
      case 'kudos':
        return Icons.thumb_up_rounded;
      case 'birthday':
        return Icons.cake_rounded;
      case 'anniversary':
        return Icons.favorite_rounded;
      default:
        return Icons.emoji_events_rounded;
    }
  }

  Color _typeColor(String type) {
    switch (type) {
      case 'kudos':
        return Colors.amber;
      case 'birthday':
        return Colors.pink;
      case 'anniversary':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  void _showGiveKudosDialog(BuildContext context) {
    final messageCtrl = TextEditingController();
    final receiverCtrl = TextEditingController();
    String type = 'kudos';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Give Kudos'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: type,
                decoration: const InputDecoration(labelText: 'Type'),
                items: ['kudos', 'birthday', 'anniversary']
                    .map((t) => DropdownMenuItem(
                          value: t,
                          child: Text(
                              '${t[0].toUpperCase()}${t.substring(1)}'),
                        ))
                    .toList(),
                onChanged: (v) => type = v!,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: receiverCtrl,
                decoration: const InputDecoration(
                  labelText: 'Receiver ID',
                  hintText: 'Enter staff ID',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: messageCtrl,
                decoration: const InputDecoration(
                  labelText: 'Message (optional)',
                  alignLabelWithHint: true,
                ),
                maxLines: 3,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (receiverCtrl.text.trim().isEmpty) return;
              ref
                  .read(recognitionListProvider.notifier)
                  .giveKudos({
                'type': type,
                'receiver_id': receiverCtrl.text.trim(),
                'message': messageCtrl.text.trim(),
              });
              Navigator.pop(ctx);
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }
}

class _RecognitionCard extends StatelessWidget {
  final RecognitionModel recognition;
  const _RecognitionCard({required this.recognition});

  IconData _typeIcon(String type) {
    switch (type) {
      case 'kudos':
        return Icons.thumb_up_rounded;
      case 'birthday':
        return Icons.cake_rounded;
      case 'anniversary':
        return Icons.favorite_rounded;
      default:
        return Icons.emoji_events_rounded;
    }
  }

  Color _typeColor(String type) {
    switch (type) {
      case 'kudos':
        return Colors.amber;
      case 'birthday':
        return Colors.pink;
      case 'anniversary':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _typeColor(recognition.type);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(_typeIcon(recognition.type),
                      color: color, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${recognition.type[0].toUpperCase()}${recognition.type.substring(1)}',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: color,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        recognition.createdAt.timeAgo(),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.5),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (recognition.message != null &&
                recognition.message!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                recognition.message!,
                style: theme.textTheme.bodyMedium,
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                if (recognition.giver != null)
                  _UserChip(
                    avatarUrl: recognition.giver!.avatarUrl,
                    initials: recognition.giver!.initials,
                    name: recognition.giver!.fullName,
                    label: 'From',
                    theme: theme,
                  ),
                if (recognition.giver != null &&
                    recognition.receiver != null)
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8),
                    child: Icon(Icons.arrow_forward_rounded, size: 16),
                  ),
                if (recognition.receiver != null)
                  _UserChip(
                    avatarUrl: recognition.receiver!.avatarUrl,
                    initials: recognition.receiver!.initials,
                    name: recognition.receiver!.fullName,
                    label: 'To',
                    theme: theme,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _UserChip extends StatelessWidget {
  final String? avatarUrl;
  final String initials;
  final String name;
  final String label;
  final ThemeData theme;
  const _UserChip({
    required this.avatarUrl,
    required this.initials,
    required this.name,
    required this.label,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        CircleAvatar(
          radius: 14,
          backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.15),
          backgroundImage: avatarUrl != null
              ? CachedNetworkImageProvider(avatarUrl!)
              : null,
          child: avatarUrl == null
              ? Text(initials,
                  style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: theme.colorScheme.primary))
              : null,
        ),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: theme.textTheme.labelSmall?.copyWith(
                    fontSize: 9,
                    color: theme.colorScheme.onSurface
                        .withValues(alpha: 0.5))),
            Text(name,
                style: theme.textTheme.bodySmall
                    ?.copyWith(fontWeight: FontWeight.w500),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ],
        ),
      ],
    );
  }
}
