import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/polls_provider.dart';

class PollDetailScreen extends ConsumerStatefulWidget {
  final String pollId;

  const PollDetailScreen({super.key, required this.pollId});

  @override
  ConsumerState<PollDetailScreen> createState() => _PollDetailScreenState();
}

class _PollDetailScreenState extends ConsumerState<PollDetailScreen> {
  String? _selectedOptionId;
  bool _showResults = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(pollsProvider.notifier).loadPolls());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(pollsProvider);
    final notifier = ref.read(pollsProvider.notifier);
    final theme = Theme.of(context);

    final poll = state.polls.where((p) => p.id == widget.pollId).firstOrNull;

    return AppScaffold(
      title: 'Poll Details',
      body: state.isLoading
          ? const PageShimmer()
          : poll == null
              ? const Center(child: Text('Poll not found'))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(poll.title,
                                style: theme.textTheme.titleLarge
                                    ?.copyWith(fontWeight: FontWeight.w600)),
                            if (poll.description != null) ...[
                              const SizedBox(height: 8),
                              Text(poll.description!),
                            ],
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Icon(Icons.schedule_rounded,
                                    size: 16, color: Colors.grey[600]),
                                const SizedBox(width: 4),
                                Text(
                                  poll.isActive
                                      ? 'Expires ${poll.expiresAt.timeAgo()}'
                                      : 'Expired',
                                  style: TextStyle(color: Colors.grey[600]),
                                ),
                                const Spacer(),
                                Text(
                                    '${poll.options.length} options',
                                    style: TextStyle(color: Colors.grey[600])),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (!_showResults && poll.isActive)
                      ...poll.options.map((o) => Card(
                            margin:
                                const EdgeInsets.symmetric(vertical: 4),
                            child: RadioListTile<String>(
                              title: Text(o.text,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w500)),
                              value: o.id,
                              groupValue: _selectedOptionId,
                              onChanged: (v) => setState(
                                  () => _selectedOptionId = v),
                            ),
                          ))
                    else
                      ...poll.options.map((o) {
                        final total = poll.options
                            .fold<int>(0, (s, e) => s + e.voteCount);
                        final pct = total > 0
                            ? (o.voteCount / total * 100)
                            : 0.0;
                        return Card(
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(child: Text(o.text)),
                                    Text('${o.voteCount} votes',
                                        style: theme.textTheme
                                            .bodySmall),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                ClipRRect(
                                  borderRadius:
                                      BorderRadius.circular(4),
                                  child: LinearProgressIndicator(
                                    value: pct / 100,
                                    minHeight: 8,
                                    backgroundColor: theme
                                        .colorScheme.primary
                                        .withValues(alpha: 0.15),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text('${pct.toStringAsFixed(1)}%',
                                    style: theme.textTheme.bodySmall),
                              ],
                            ),
                          ),
                        );
                      }),
                    const SizedBox(height: 24),
                    if (poll.isActive && !_showResults) ...[
                      FilledButton(
                        onPressed: _selectedOptionId == null
                            ? null
                            : () async {
                                await notifier.respondToPoll(
                                    widget.pollId, _selectedOptionId!);
                                setState(() => _showResults = true);
                              },
                        child: const Text('Submit Vote'),
                      ),
                      const SizedBox(height: 8),
                    ],
                    if (poll.selectedOptionId != null || _showResults)
                      TextButton(
                        onPressed: () {
                          setState(
                              () => _showResults = !_showResults);
                        },
                        child: Text(
                            _showResults ? 'Hide Results' : 'View Results'),
                      ),
                    if (poll.isActive && _showResults == false)
                      TextButton(
                        onPressed: () =>
                            setState(() => _showResults = true),
                        child: const Text('View Results'),
                      ),
                  ],
                ),
    );
  }
}
