# Phase 5: Global Search — Mobile/Flutter UX Review

**Review Date:** 2026-10-09  
**Reviewer:** Mobile UX Subagent  
**Plan Version:** Draft v1 (`.planning/phases/phase-5-global-search/PLAN.md`)  
**Status:** ⚠️ **Critical Gaps Found — Do Not Merge Until Addressed**

---

## Executive Summary

The Phase 5 plan correctly identifies the architectural components for global search but **omits critical mobile/Flutter UX implementation details** across all 9 review criteria. The plan describes *what* to build but not *how* to meet platform conventions, accessibility standards, or performance requirements. **9 findings** ranging from Critical to Medium severity.

---

## Findings by Criterion

### 1. Keyboard Navigation (↑/↓/Enter/Esc) — **CRITICAL**

**Finding:** Plan mentions "HW keyboard nav" (Commit 3, line 114) and creates `keyboard_shortcuts.dart` (Commit 4, line 126) but **does not specify `FocusNode` + `RawKeyboardListener` integration** for `SearchBottomSheet`.

**Required Implementation:**
- `FocusNode` on result list for arrow-key navigation
- `RawKeyboardListener` wrapping sheet content for `ArrowUp`, `ArrowDown`, `Enter`, `Escape`
- Focus trap: `FocusScope` with `autofocus: true` on open; restore focus on close
- `FocusTraversalGroup` to contain tab order within sheet

**Missing from Plan:**
- No `FocusNode` declaration in `SearchBottomSheet` or `SearchProvider`
- No `RawKeyboardListener` in widget tree
- No focus restoration logic when sheet dismisses
- No handling of `HardwareKeyboard.instance.addHandler` vs `RawKeyboardListener` conflict

**Fix:** Add to Commit 3 specification:
```dart
// In SearchBottomSheet
final FocusNode _listFocusNode = FocusNode();
final FocusNode _searchFieldFocusNode = FocusNode();

@override
void initState() {
  super.initState();
  WidgetsBinding.instance.addPostFrameCallback((_) {
    _searchFieldFocusNode.requestFocus();
  });
}

@override
Widget build(BuildContext context) {
  return RawKeyboardListener(
    focusNode: FocusNode(),
    autofocus: true,
    onKey: _handleKeyEvent,
    child: FocusScope(
      child: FocusTraversalGroup(
        policy: WidgetOrderTraversalPolicy(),
        child: /* sheet content */,
      ),
    ),
  );
}

void _handleKeyEvent(RawKeyEvent event) {
  if (event is RawKeyDownEvent) {
    switch (event.logicalKey) {
      case LogicalKeyboardKey.arrowDown:
        ref.read(searchProvider.notifier).moveSelection(1);
        break;
      case LogicalKeyboardKey.arrowUp:
        ref.read(searchProvider.notifier).moveSelection(-1);
        break;
      case LogicalKeyboardKey.enter:
        ref.read(searchProvider.notifier).selectCurrent();
        break;
      case LogicalKeyboardKey.escape:
        Navigator.of(context).pop();
        break;
    }
  }
}
```

---

### 2. Touch Targets (48dp Minimum) — **HIGH**

**Finding:** Plan specifies `ListTile` or "custom card sizing" (line 114) but **no minimum height enforcement**. Existing `StaffDirectoryScreen` uses `Card` with `Padding(12)` — total ~56dp but **not guaranteed** for search results.

**Required:** All interactive result items ≥48dp height (Material Design spec).

**Current Risk:** Custom cards in `SearchBottomSheet` could render at <48dp if content is sparse (e.g., icon-only results).

**Fix:** Add to Commit 3 specification:
```dart
// Enforce minimum touch target
class SearchResultTile extends StatelessWidget {
  const SearchResultTile({super.key, required this.child, this.onTap});
  
  final Widget child;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: onTap != null,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48), // 48dp minimum
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: child,
          ),
        ),
      ),
    );
  }
}
```

---

### 3. Debounce & Cancellation (150ms, Dio CancelToken) — **HIGH**

**Finding:** Plan mentions "debounced query (150ms)" and "Dio cancel tokens" (lines 36, 114) but **no implementation specification** for:
- Debounce mechanism (`Timer`, `debounce` from `rxdart`, or `async` debounce)
- `CancelToken` lifecycle management per keystroke
- Previous request cancellation before new request fires

**Existing Pattern:** `UpdateService` uses `CancelToken` (line 228-249) but for **single long-running download**, not rapid keystroke cancellation.

**Missing:**
- `CancelToken` creation per search invocation
- `cancel()` on previous token before new request
- Debounce implementation (recommend `rxdart`'s `debounceTime` or custom `Timer`)

**Fix:** Add to Commit 3 (`search_repository.dart` + `search_provider.dart`):
```dart
// search_provider.dart
class SearchProvider extends AutoDisposeAsyncNotifier<SearchState> {
  CancelToken? _currentCancelToken;
  Timer? _debounceTimer;

  void search(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 150), () {
      _executeSearch(query);
    });
  }

  Future<void> _executeSearch(String query) async {
    _currentCancelToken?.cancel('Superseded by new query');
    _currentCancelToken = CancelToken();
    
    state = const AsyncLoading();
    try {
      final results = await ref.read(searchRepositoryProvider).search(
        query, 
        cancelToken: _currentCancelToken,
      );
      state = AsyncData(results);
    } catch (e) {
      if (e is DioException && CancelToken.isCancel(e)) return; // Ignore cancelled
      state = AsyncError(e, StackTrace.current);
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _currentCancelToken?.cancel('Provider disposed');
    super.dispose();
  }
}
```

---

### 4. Accessibility (Semantic Labels, Announcements, Focus Trap) — **CRITICAL**

**Finding:** Plan mentions "semantic labels" and "screen reader announcements" (Commit 4, line 127) but **zero implementation detail**. Current codebase has **only 2 `Semantics` usages** (attendance_screen, voice_copilot_screen) — no pattern for search results.

**Missing:**
- `Semantics` labels on each result item (entity type, title, subtitle)
- Live region / `SemanticsService.announce` for result count changes
- Focus trap within bottom sheet (no tab escape)
- `ModalBarrier` semantics for sheet overlay
- TalkBack/VoiceOver tested paths

**Fix:** Add to Commit 4 specification:
```dart
// In SearchResultTile
Semantics(
  label: '$entityType: $title. $subtitle. Tap to open.',
  button: true,
  child: /* tile content */,
)

// In SearchProvider - announce result count
void _announceResults(int count) {
  String announcement;
  if (count == 0) {
    announcement = 'No results found';
  } else if (count == 1) {
    announcement = '1 result found';
  } else {
    announcement = '$count results found';
  }
  SemanticsService.announce(announcement, TextDirection.ltr);
}

// In SearchBottomSheet - focus trap
FocusScope(
  autofocus: true,
  onFocusChange: (hasFocus) {
    if (!hasFocus) {
      // Re-focus into sheet if focus escapes
      _listFocusNode.requestFocus();
    }
  },
  child: /* content */,
)
```

---

### 5. Deep Link Handoff (WebViewHandoffScreen + Phase 4 Nonce) — **HIGH**

**Finding:** Plan states "Entity result tap → GoRouter native screen OR `WebViewHandoffScreen` for web-only entities" (Commit 5, line 136) but **no routing logic specification** for distinguishing native vs. web-only entities.

**Current Router:** Has catch-all `/handoff` route (line 840-854) and wildcard `/school/:path*`, `/admin/:path*` (lines 857-882) but **no mapping from entity type to route strategy**.

**Missing:**
- Entity type → route strategy mapping (native vs. handoff)
- How search result carries `targetPath` and `title` for `WebViewHandoffScreen`
- Whether handoff uses `/handoff?path=...` or direct wildcard match

**Fix:** Add to Commit 5 specification:
```dart
// search_provider.dart or search_repository.dart
enum EntityRouteStrategy { native, handoff }

const Map<String, EntityRouteStrategy> entityRouteStrategy = {
  'students': EntityRouteStrategy.native,
  'staff': EntityRouteStrategy.native,
  'tasks': EntityRouteStrategy.native,
  'events': EntityRouteStrategy.native,
  'announcements': EntityRouteStrategy.native,
  'daily-reports': EntityRouteStrategy.native,
  'circulars': EntityRouteStrategy.native,
  'polls': EntityRouteStrategy.native,
  'purchase-requests': EntityRouteStrategy.handoff,   // Complex finance reports
  'expense-claims': EntityRouteStrategy.handoff,
  'fee-receipts': EntityRouteStrategy.handoff,
  'help-desk-tickets': EntityRouteStrategy.native,
  'bookings': EntityRouteStrategy.native,
  'recognition': EntityRouteStrategy.native,
  'comments': EntityRouteStrategy.native,
  'asset-inventory': EntityRouteStrategy.native,
  'media-assets': EntityRouteStrategy.native,
};

// In SearchBottomSheet onTap handler
void _onResultTap(SearchResult result) {
  final strategy = entityRouteStrategy[result.entityType] ?? EntityRouteStrategy.native;
  if (strategy == EntityRouteStrategy.handoff) {
    context.push('/handoff?path=${Uri.encodeComponent(result.targetPath)}&title=${Uri.encodeComponent(result.title)}');
  } else {
    context.push(result.nativeRoute);
  }
}
```

---

### 6. Offline Support (Offline State + Hive Cache) — **MEDIUM**

**Finding:** Plan mentions "show appropriate offline state with retry; cache recent searches locally (Hive)" (line 137) but **no specification** for:
- Offline detection (connectivity package, `Connectivity().onConnectivityChanged`)
- Offline UI state (cached results + "offline" banner + retry button)
- Hive box schema for recent searches
- Cache invalidation / max age

**Existing Pattern:** `HiveMigrationHandler` exists (schema version 1) but **no search cache box defined**. `OfflineCacheService` exists but for announcements/other features.

**Fix:** Add to Commit 3/5 specification:
```dart
// Hive box for recent searches (Commit 3)
@HiveType(typeId: 42)
class RecentSearch {
  @HiveField(0) final String query;
  @HiveField(1) final DateTime timestamp;
  @HiveField(2) final List<String> entityTypes;
  RecentSearch({required this.query, required this.timestamp, required this.entityTypes});
}

// In SearchProvider - offline handling
StreamSubscription<ConnectivityResult>? _connectivitySub;

@override
void initState() {
  super.initState();
  _connectivitySub = Connectivity().onConnectivityChanged.listen((result) {
    final wasOffline = _isOffline;
    _isOffline = result == ConnectivityResult.none;
    if (wasOffline && !_isOffline && _lastQuery.isNotEmpty) {
      search(_lastQuery); // Auto-retry on reconnect
    }
    _updateOfflineState();
  });
}

// Offline UI in SearchBottomSheet
if (_isOffline && cachedResults.isNotEmpty) {
  return Column(
    children: [
      const OfflineBanner(onRetry: () => ref.read(searchProvider.notifier).search(lastQuery)),
      Expanded(child: ResultsList(results: cachedResults)),
    ],
  );
}
```

---

### 7. State Persistence (Recent Searches, 10 Items, Clear Action) — **MEDIUM**

**Finding:** Plan mentions "Recent searches (persisted), search history clear action" (Commit 5, line 137) but **no specification** for:
- Hive box operations (add, get, clear)
- Max 10 items enforcement (FIFO)
- Deduplication (same query not added twice)
- UI for recent searches (empty query state)
- Clear action placement (trailing icon? settings?)

**Fix:** Add to Commit 5 specification:
```dart
// RecentSearchesService (new file)
class RecentSearchesService {
  static const String boxName = 'recent_searches';
  static const int maxItems = 10;

  Future<void> add(String query, List<String> entityTypes) async {
    final box = await Hive.openBox<RecentSearch>(boxName);
    final existing = box.values.toList().indexWhere((s) => s.query == query);
    if (existing != -1) {
      await box.deleteAt(existing); // Remove old position
    }
    await box.add(RecentSearch(
      query: query,
      timestamp: DateTime.now(),
      entityTypes: entityTypes,
    ));
    // Enforce max 10
    while (box.length > maxItems) {
      await box.deleteAt(0);
    }
  }

  Future<List<RecentSearch>> getAll() async {
    final box = await Hive.openBox<RecentSearch>(boxName);
    return box.values.toList().reversed.toList(); // Most recent first
  }

  Future<void> clear() async {
    final box = await Hive.openBox<RecentSearch>(boxName);
    await box.clear();
  }
}

// In SearchBottomSheet - empty query state shows recent searches
if (query.isEmpty && recentSearches.isNotEmpty) {
  return Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Recent Searches', style: theme.textTheme.titleSmall),
            TextButton(
              onPressed: () => ref.read(recentSearchesProvider.notifier).clear(),
              child: const Text('Clear'),
            ),
          ],
        ),
      ),
      ...recentSearches.map((s) => SearchResultTile(
        child: Text(s.query),
        onTap: () => ref.read(searchProvider.notifier).search(s.query),
      )),
    ],
  );
}
```

---

### 8. Performance (Virtualized List + cached_network_image) — **MEDIUM**

**Finding:** Plan mentions "Virtualized list (`ListView.builder`); `cached_network_image` for avatars" (line 137) — **correct intent but no enforcement**. Must verify:
- `ListView.builder` (not `Column`/`ListView` with `children`)
- `CachedNetworkImage` with placeholder/error states
- Image cache size limits (memory pressure)
- `AutomaticKeepAliveClientMixin` not needed (stateless items)

**Existing Pattern:** `StaffDirectoryScreen` uses `CachedNetworkImageProvider` on `CircleAvatar` (correct). `cached_network_image` in `pubspec.yaml`.

**Risk:** If `SearchBottomSheet` uses `Column` + `ListView(children: [...])` instead of `ListView.builder`, **memory/performance will degrade** with 50+ results.

**Fix:** Explicitly mandate in Commit 3:
```dart
// SearchBottomSheet results list - MUST use ListView.builder
ListView.builder(
  itemCount: results.length,
  itemBuilder: (context, index) {
    final result = results[index];
    return SearchResultTile(
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundImage: result.avatarUrl != null
                ? CachedNetworkImageProvider(result.avatarUrl!)
                : null,
            child: result.avatarUrl == null
                ? Text(result.initials)
                : null,
          ),
          // ... rest of tile
        ],
      ),
      onTap: () => _onResultTap(result),
    );
  },
)
```

---

### 9. Platform Parity (Web CommandPalette ↔ Mobile SearchBottomSheet) — **HIGH**

**Finding:** Plan states "identical result structure, keyboard shortcuts (Cmd/Ctrl+K), and entity type coverage" (line 138) but **no shared data contract** or cross-platform test strategy.

**Gaps:**
- No shared TypeScript/Dart type definitions for search result shape
- Web uses `AbortController`, Mobile uses `CancelToken` — no parity test
- Keyboard shortcuts: Web has `Cmd/Ctrl+K` (line 84), Mobile plans `Ctrl+K`/`Meta+K` (Commit 4) but **no verification they match**
- Entity type coverage: Web adds "Entities section" (Commit 2), Mobile adds "nav + entities" (Commit 3) — **no shared entity type list**

**Fix:** Add shared contract + parity test:
```typescript
// packages/shared/src/search-types.ts (NEW - shared package)
export interface SearchResult {
  id: string;
  entityType: EntityType;
  title: string;
  subtitle: string;
  avatarUrl?: string;
  initials?: string;
  nativeRoute: string;      // Mobile GoRouter path
  webRoute: string;         // Web Next.js route
  targetPath?: string;      // For handoff
  isWebOnly: boolean;
}

export type EntityType = 
  | 'students' | 'staff' | 'tasks' | 'events' | 'announcements'
  | 'daily-reports' | 'purchase-requests' | 'expense-claims' | 'fee-receipts'
  | 'help-desk-tickets' | 'bookings' | 'polls' | 'recognition' | 'comments'
  | 'asset-inventory' | 'media-assets';
```

```dart
// thaibahive_mobile_app/lib/features/search/data/search_models.dart
// Mirrors TypeScript interface exactly
@freezed
class SearchResult with _$SearchResult {
  const factory SearchResult({
    required String id,
    required String entityType,
    required String title,
    required String subtitle,
    String? avatarUrl,
    String? initials,
    required String nativeRoute,
    required String webRoute,
    String? targetPath,
    required bool isWebOnly,
  }) = _SearchResult;
}

// Parity test (Commit 6 - new file)
test('Platform parity: entity type coverage matches', () {
  final webTypes = WebSearchTypes.entityTypes; // From shared package
  final mobileTypes = MobileSearchTypes.entityTypes; // From shared package
  expect(webTypes, equals(mobileTypes));
});

test('Platform parity: keyboard shortcuts match', () {
  expect(webShortcut, equals('CmdOrCtrl+K'));
  expect(mobileShortcut, equals('Control+K')); // Meta+K on macOS
});
```

---

## Severity Summary

| # | Criterion | Severity | Blocking? |
|---|-----------|----------|-----------|
| 1 | Keyboard Navigation (FocusNode/RawKeyboardListener) | **CRITICAL** | ✅ Yes |
| 2 | Touch Targets (48dp) | **HIGH** | ✅ Yes |
| 3 | Debounce & Cancellation (CancelToken) | **HIGH** | ✅ Yes |
| 4 | Accessibility (Semantics, Announce, Focus Trap) | **CRITICAL** | ✅ Yes |
| 5 | Deep Link Handoff (Entity→Route mapping) | **HIGH** | ✅ Yes |
| 6 | Offline Support (Hive cache, retry) | **MEDIUM** | ⚠️ Recommended |
| 7 | State Persistence (Recent searches, clear) | **MEDIUM** | ⚠️ Recommended |
| 8 | Performance (Virtualized list, cached images) | **MEDIUM** | ✅ Yes |
| 9 | Platform Parity (Shared types, shortcuts, coverage) | **HIGH** | ✅ Yes |

---

## Required Plan Updates

**Before this plan can be approved, the following must be added to PLAN.md:**

1. **Commit 3 (`search_bottom_sheet.dart`)** — Add `FocusNode`, `RawKeyboardListener`, `FocusScope` focus trap, 48dp minimum tile height, `ListView.builder`, `CachedNetworkImage` usage, `Semantics` labels
2. **Commit 3 (`search_provider.dart`)** — Add `CancelToken` lifecycle, 150ms debounce (Timer/rxdart), offline connectivity listener, recent searches Hive integration
3. **Commit 3 (`search_repository.dart`)** — Accept `CancelToken` parameter in `search()` method
4. **Commit 4** — Add `SemanticsService.announce` for result count, focus restoration on close
5. **Commit 5** — Add `entityRouteStrategy` mapping, `WebViewHandoffScreen` invocation with `targetPath`/`title`, recent searches UI in empty state, clear action
6. **New: `packages/shared/src/search-types.ts`** — Shared TypeScript/Dart result contract
7. **Commit 6** — Add platform parity tests (entity types, shortcuts, result structure)

---

## Verification Checklist for Implementation

When implementing, verify each commit against:

- [ ] `flutter analyze` → 0 errors, 0 warnings
- [ ] `flutter test` → All search tests pass
- [ ] Manual: Open sheet → `Tab`/`Shift+Tab` stays in sheet (focus trap)
- [ ] Manual: `↑`/`↓` moves selection, `Enter` opens, `Esc` closes
- [ ] Manual: TalkBack/VoiceOver announces result count on query change
- [ ] Manual: Each result tile ≥48dp height (Layout Inspector)
- [ ] Manual: Rapid typing cancels previous requests (network tab)
- [ ] Manual: Offline → shows cached results + retry banner
- [ ] Manual: Recent searches persist across app restart, clear works
- [ ] Manual: Web `Cmd+K` and Mobile `Ctrl+K` open equivalent UIs
- [ ] Manual: Web-only entity (e.g., purchase-request) opens `WebViewHandoffScreen`
- [ ] Automated: Parity test asserts identical entity type list

---

## Recommendation

**Do not proceed to implementation** until PLAN.md is updated with the above specifications. The current plan treats mobile as "same as web but in a bottom sheet" — this will produce a non-accessible, non-performant, non-parity experience.

**Estimated additional spec work:** 2-3 hours to detail the 9 areas above in PLAN.md commits.  
**Estimated implementation impact:** +1 day (Commit 3-5 expansion) but prevents 3-5 days of rework.