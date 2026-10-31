import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme.dart';
import '../data/search_models.dart';
import 'search_provider.dart';

class SearchBottomSheet extends ConsumerStatefulWidget {
  final bool isModal;

  const SearchBottomSheet({super.key, this.isModal = true});

  static Future<SearchResult?> show(BuildContext context) async {
    final result = await showModalBottomSheet<SearchResult>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const SearchBottomSheet(isModal: true),
    );

    if (result != null && context.mounted) {
      if (result.routeStrategy == EntityRouteStrategy.handoff || result.isWebOnly) {
        final target = result.targetPath ?? result.webRoute;
        final encodedPath = Uri.encodeComponent(target);
        final encodedTitle = Uri.encodeComponent(result.title);
        context.push('/handoff?path=$encodedPath&title=$encodedTitle');
      } else {
        context.push(result.nativeRoute);
      }
    }
    return result;
  }

  @override
  ConsumerState<SearchBottomSheet> createState() => _SearchBottomSheetState();
}

class _SearchBottomSheetState extends ConsumerState<SearchBottomSheet> {
  late final TextEditingController _textController;
  late final FocusNode _inputFocusNode;
  late final FocusNode _keyboardFocusNode;

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController();
    _inputFocusNode = FocusNode();
    _keyboardFocusNode = FocusNode();
  }

  @override
  void dispose() {
    _textController.dispose();
    _inputFocusNode.dispose();
    _keyboardFocusNode.dispose();
    super.dispose();
  }

  void _handleKey(RawKeyEvent event) {
    if (event is! RawKeyDownEvent) return;

    final notifier = ref.read(searchProvider.notifier);
    final state = ref.read(searchProvider);

    if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
      notifier.selectNextResult();
    } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
      notifier.selectPreviousResult();
    } else if (event.logicalKey == LogicalKeyboardKey.enter) {
      if (state.selectedIndex >= 0 && state.selectedIndex < state.results.length) {
        _selectResult(state.results[state.selectedIndex]);
      }
    } else if (event.logicalKey == LogicalKeyboardKey.escape) {
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }
    }
  }

  void _selectResult(SearchResult result) {
    final notifier = ref.read(searchProvider.notifier);
    final state = ref.read(searchProvider);

    if (state.query.trim().isNotEmpty) {
      notifier.addRecentSearch(state.query.trim());
    }

    if (widget.isModal && Navigator.of(context).canPop()) {
      Navigator.of(context).pop(result);
    } else {
      if (result.routeStrategy == EntityRouteStrategy.handoff || result.isWebOnly) {
        final target = result.targetPath ?? result.webRoute;
        final encodedPath = Uri.encodeComponent(target);
        final encodedTitle = Uri.encodeComponent(result.title);
        context.push('/handoff?path=$encodedPath&title=$encodedTitle');
      } else {
        context.push(result.nativeRoute);
      }
    }
  }

  IconData _getEntityIcon(String entityType) {
    switch (entityType) {
      case 'students':
        return Icons.school_rounded;
      case 'staff':
        return Icons.badge_rounded;
      case 'tasks':
        return Icons.check_circle_outline_rounded;
      case 'events':
        return Icons.event_rounded;
      case 'announcements':
        return Icons.campaign_rounded;
      case 'daily-reports':
        return Icons.assessment_rounded;
      case 'purchase-requests':
        return Icons.shopping_cart_rounded;
      case 'expense-claims':
        return Icons.receipt_long_rounded;
      case 'fee-receipts':
        return Icons.payments_rounded;
      case 'help-desk-tickets':
        return Icons.support_agent_rounded;
      case 'bookings':
        return Icons.meeting_room_rounded;
      case 'recognition':
        return Icons.emoji_events_rounded;
      case 'comments':
        return Icons.chat_bubble_outline_rounded;
      case 'asset-inventory':
        return Icons.inventory_2_rounded;
      case 'circulars':
        return Icons.description_rounded;
      case 'polls':
        return Icons.poll_rounded;
      case 'media-assets':
        return Icons.perm_media_rounded;
      default:
        return Icons.search_rounded;
    }
  }

  String _formatEntityType(String entityType) {
    return entityType
        .split('-')
        .map((part) => part.isNotEmpty ? '${part[0].toUpperCase()}${part.substring(1)}' : '')
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final searchState = ref.watch(searchProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return RawKeyboardListener(
      focusNode: _keyboardFocusNode,
      onKey: _handleKey,
      child: Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E2228) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          boxShadow: AppShadows.card(Colors.black),
        ),
        child: Column(
          children: [
            // Handle bar
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey[700] : Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Search Header & Input
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: TextField(
                controller: _textController,
                focusNode: _inputFocusNode,
                autofocus: true,
                textInputAction: TextInputAction.search,
                style: TextStyle(
                  color: isDark ? Colors.white : Colors.black87,
                  fontSize: 16,
                ),
                decoration: InputDecoration(
                  hintText: 'Search students, staff, tasks, events...',
                  hintStyle: TextStyle(
                    color: isDark ? Colors.grey[500] : Colors.grey[400],
                    fontSize: 15,
                  ),
                  prefixIcon: Icon(
                    Icons.search_rounded,
                    color: isDark ? AppColors.primary(context) : Theme.of(context).primaryColor,
                  ),
                  suffixIcon: _textController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded),
                          onPressed: () {
                            _textController.clear();
                            ref.read(searchProvider.notifier).onQueryChanged('');
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: isDark ? const Color(0xFF121519) : const Color(0xFFF3F4F6),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
                onChanged: (value) {
                  ref.read(searchProvider.notifier).onQueryChanged(value);
                  setState(() {});
                },
                onSubmitted: (value) {
                  if (searchState.results.isNotEmpty) {
                    final target = searchState.selectedIndex >= 0
                        ? searchState.results[searchState.selectedIndex]
                        : searchState.results.first;
                    _selectResult(target);
                  }
                },
              ),
            ),

            // Filter Chips
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  _buildFilterChip('All', searchState.selectedTypes.isEmpty, () {
                    if (searchState.selectedTypes.isNotEmpty) {
                      for (final type in List<String>.from(searchState.selectedTypes)) {
                        ref.read(searchProvider.notifier).toggleEntityType(type);
                      }
                    }
                  }),
                  ...kSearchableEntityTypes.map((type) {
                    final isSelected = searchState.selectedTypes.contains(type);
                    return _buildFilterChip(_formatEntityType(type), isSelected, () {
                      ref.read(searchProvider.notifier).toggleEntityType(type);
                    });
                  }),
                ],
              ),
            ),

            const SizedBox(height: 8),

            // Offline banner
            if (searchState.isOffline)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.amber.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.amber.withOpacity(0.4)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.wifi_off_rounded, color: Colors.amber, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Offline: Showing cached results where available',
                        style: TextStyle(
                          color: isDark ? Colors.amber[200] : Colors.amber[900],
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Error banner
            if (searchState.errorMessage != null && !searchState.isLoading)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        searchState.errorMessage!,
                        style: TextStyle(
                          color: isDark ? Colors.red[200] : Colors.red[900],
                          fontSize: 13,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () => ref.read(searchProvider.notifier).retry(),
                      child: const Text('Retry', style: TextStyle(fontSize: 13)),
                    ),
                  ],
                ),
              ),

            // Main Content Area
            Expanded(
              child: _buildBody(context, searchState, isDark),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, bool isSelected, VoidCallback onTap) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            color: isSelected
                ? (isDark ? Colors.black87 : Colors.white)
                : (isDark ? Colors.grey[300] : Colors.grey[700]),
          ),
        ),
        selected: isSelected,
        onSelected: (_) => onTap(),
        selectedColor: isDark ? AppColors.primary(context) : Theme.of(context).primaryColor,
        backgroundColor: isDark ? const Color(0xFF282D35) : const Color(0xFFE5E7EB),
        checkmarkColor: isDark ? Colors.black87 : Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        side: BorderSide.none,
      ),
    );
  }

  Widget _buildBody(BuildContext context, SearchState state, bool isDark) {
    if (state.isLoading) {
      return _buildLoadingSkeleton(isDark);
    }

    if (state.query.isEmpty) {
      return _buildEmptyQueryView(context, state, isDark);
    }

    if (state.results.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.search_off_rounded, size: 56, color: Colors.grey[400]),
              const SizedBox(height: 12),
              Text(
                'No results found for "${state.query}"',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white70 : Colors.black87,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Try checking your spelling or adjusting entity filters',
                style: TextStyle(
                  fontSize: 14,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      itemCount: state.results.length,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemBuilder: (context, index) {
        final result = state.results[index];
        final isSelected = index == state.selectedIndex;

        return _buildResultTile(context, result, isSelected, isDark);
      },
    );
  }

  Widget _buildEmptyQueryView(BuildContext context, SearchState state, bool isDark) {
    if (state.recentSearches.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.travel_explore_rounded,
                size: 64,
                color: isDark ? Colors.grey[700] : Colors.grey[300],
              ),
              const SizedBox(height: 16),
              Text(
                'Global Search & Omnibox',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white70 : Colors.black87,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Search across students, staff, tasks, events, purchase requests, announcements, and more',
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Recent Searches',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.grey[300] : Colors.grey[700],
                ),
              ),
              TextButton(
                onPressed: () {
                  ref.read(searchProvider.notifier).clearRecentSearches();
                },
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(50, 30),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('Clear All', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: state.recentSearches.length,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemBuilder: (context, index) {
              final query = state.recentSearches[index];
              return ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 48),
                child: Material(
                  color: Colors.transparent,
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                  leading: const Icon(Icons.history_rounded, size: 20),
                  title: Text(
                    query,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.close_rounded, size: 18),
                    onPressed: () {
                      ref.read(searchProvider.notifier).removeRecentSearch(query);
                    },
                  ),
                  onTap: () {
                    _textController.text = query;
                    ref.read(searchProvider.notifier).onQueryChanged(query);
                    setState(() {});
                  },
                ),
              ),
            );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildResultTile(
    BuildContext context,
    SearchResult result,
    bool isSelected,
    bool isDark,
  ) {
    final semanticLabel =
        '${result.entityType}: ${result.title}. ${result.subtitle ?? ''}. Tap to open.';

    return Semantics(
      label: semanticLabel,
      button: true,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48),
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 3),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark
                    ? AppColors.primary(context).withOpacity(0.2)
                    : Theme.of(context).primaryColor.withOpacity(0.08))
                : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            border: isSelected
                ? Border.all(
                    color: isDark
                        ? AppColors.primary(context).withOpacity(0.5)
                        : Theme.of(context).primaryColor.withOpacity(0.4),
                  )
                : null,
          ),
          child: Material(
            color: Colors.transparent,
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            leading: _buildAvatar(result, isDark),
            title: Row(
              children: [
                Expanded(
                  child: Text(
                    result.title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (result.routeStrategy == EntityRouteStrategy.handoff || result.isWebOnly)
                  Padding(
                    padding: const EdgeInsets.only(left: 6),
                    child: Tooltip(
                      message: 'Opens in Web View',
                      child: Icon(
                        Icons.open_in_browser_rounded,
                        size: 16,
                        color: isDark ? Colors.blue[300] : Colors.blue[700],
                      ),
                    ),
                  ),
              ],
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (result.subtitle != null && result.subtitle!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    result.subtitle!,
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF282D35) : const Color(0xFFEEF2F6),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _formatEntityType(result.entityType),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: isDark ? Colors.grey[300] : Colors.grey[700],
                    ),
                  ),
                ),
              ],
            ),
            trailing: const Icon(Icons.chevron_right_rounded, size: 20),
            onTap: () => _selectResult(result),
          ),
        ),
      ),
    ),
    );
  }

  Widget _buildAvatar(SearchResult result, bool isDark) {
    if (result.avatarUrl != null && result.avatarUrl!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: CachedNetworkImage(
          imageUrl: result.avatarUrl!,
          width: 40,
          height: 40,
          fit: BoxFit.cover,
          placeholder: (context, url) => Container(
            width: 40,
            height: 40,
            color: isDark ? Colors.grey[800] : Colors.grey[200],
            child: const Center(
              child: SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          ),
          errorWidget: (context, url, error) => _buildFallbackAvatar(result, isDark),
        ),
      );
    }
    return _buildFallbackAvatar(result, isDark);
  }

  Widget _buildFallbackAvatar(SearchResult result, bool isDark) {
    if (result.initials != null && result.initials!.isNotEmpty) {
      return CircleAvatar(
        radius: 20,
        backgroundColor: isDark ? const Color(0xFF282D35) : const Color(0xFFE2E8F0),
        child: Text(
          result.initials!,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
      );
    }

    return CircleAvatar(
      radius: 20,
      backgroundColor: isDark ? const Color(0xFF282D35) : const Color(0xFFE2E8F0),
      child: Icon(
        _getEntityIcon(result.entityType),
        size: 20,
        color: isDark ? Colors.grey[300] : Colors.grey[700],
      ),
    );
  }

  Widget _buildLoadingSkeleton(bool isDark) {
    return ListView.builder(
      itemCount: 6,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2A2E35) : const Color(0xFFE2E8F0),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: double.infinity,
                      height: 14,
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF2A2E35) : const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: 150,
                      height: 10,
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF2A2E35) : const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
