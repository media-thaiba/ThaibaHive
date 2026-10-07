import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/providers.dart';

// ---------------------------------------------------------------------------
// SDUI manifest models (mirror of MobileTodayHubManifest / MobileQuickAction)
// ---------------------------------------------------------------------------

class TodayHubQuickAction {
  final String id;
  final String label;
  final String icon;
  final String route;
  final String capability;
  final int tier;

  const TodayHubQuickAction({
    required this.id,
    required this.label,
    required this.icon,
    required this.route,
    required this.capability,
    this.tier = 1,
  });

  factory TodayHubQuickAction.fromJson(Map<String, dynamic> json) =>
      TodayHubQuickAction(
        id: (json['id'] ?? '') as String,
        label: (json['label'] ?? '') as String,
        icon: (json['icon'] ?? 'apps') as String,
        route: (json['route'] ?? '/') as String,
        capability: (json['capability'] ?? '') as String,
        tier: (json['tier'] ?? 1) as int,
      );
}

class TodayHubSection {
  final String id;
  final int priority;
  final bool enabled;
  final int? maxItems;

  const TodayHubSection({
    required this.id,
    required this.priority,
    this.enabled = true,
    this.maxItems,
  });

  factory TodayHubSection.fromJson(Map<String, dynamic> json) =>
      TodayHubSection(
        id: (json['id'] ?? '') as String,
        priority: (json['priority'] ?? 99) as int,
        enabled: (json['enabled'] ?? false) as bool,
        maxItems: json['maxItems'] as int?,
      );
}

class TodayHubManifest {
  final int version;
  final String generatedAt;
  final List<TodayHubQuickAction> quickActions;
  final List<TodayHubSection> sections;
  final bool isFallback;

  const TodayHubManifest({
    required this.version,
    required this.generatedAt,
    required this.quickActions,
    required this.sections,
    this.isFallback = false,
  });

  factory TodayHubManifest.fromJson(Map<String, dynamic> json) =>
      TodayHubManifest(
        version: (json['version'] ?? 1) as int,
        generatedAt: (json['generatedAt'] ?? '') as String,
        quickActions: (json['quickActions'] as List<dynamic>? ?? const [])
            .whereType<Map>()
            .map((e) => TodayHubQuickAction.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
        sections: (json['sections'] as List<dynamic>? ?? const [])
            .whereType<Map>()
            .map((e) => TodayHubSection.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
      );

  /// Enabled sections ordered by server priority; unknown section ids stay in
  /// the list and are ignored by the renderer (forward compatibility).
  List<TodayHubSection> get orderedEnabledSections {
    final list = sections.where((s) => s.enabled).toList()
      ..sort((a, b) => a.priority.compareTo(b.priority));
    return list;
  }
}

// ---------------------------------------------------------------------------
// Fallback manifest (hardcoded order matching the pre-SDUI Today screen)
// ---------------------------------------------------------------------------

const kFallbackTodayHubManifest = TodayHubManifest(
  version: 0,
  generatedAt: '',
  quickActions: [
    TodayHubQuickAction(
      id: 'canteen.order.create',
      label: 'Canteen',
      icon: 'restaurant',
      route: '/canteen',
      capability: 'canteen.order.create',
    ),
    TodayHubQuickAction(
      id: 'helpdesk.ticket.create',
      label: 'Helpdesk',
      icon: 'medical_services',
      route: '/help-desk',
      capability: 'helpdesk.ticket.create',
    ),
    TodayHubQuickAction(
      id: 'booking.resource.create',
      label: 'Book Room',
      icon: 'meeting_room',
      route: '/bookings/create',
      capability: 'booking.resource.create',
    ),
    TodayHubQuickAction(
      id: 'visitor.pass.create',
      label: 'Visitor Pass',
      icon: 'person_add',
      route: '/visitors',
      capability: 'visitor.pass.create',
    ),
  ],
  sections: [
    TodayHubSection(id: 'urgent_actions', priority: 1, maxItems: 5),
    TodayHubSection(id: 'attendance', priority: 2),
    TodayHubSection(id: 'quick_actions', priority: 3, maxItems: 4),
    TodayHubSection(id: 'timeline', priority: 4, maxItems: 5),
    TodayHubSection(id: 'circular', priority: 5, maxItems: 1),
  ],
);

// ---------------------------------------------------------------------------
// Manifest fetch
// ---------------------------------------------------------------------------

/// `GET /api/mobile/today-hub` — 403 (flag off / missing `reports:read`) and
/// network failures surface as `AsyncError`; the screen then renders
/// [kFallbackTodayHubManifest] plus an inline retry.
final todayHubProvider = FutureProvider<TodayHubManifest>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<dynamic>(
    '/mobile/today-hub',
    fromJson: (json) => json,
  );
  if (data is! Map<String, dynamic>) {
    throw const FormatException('Malformed today-hub manifest');
  }
  return TodayHubManifest.fromJson(data);
});

// ---------------------------------------------------------------------------
// Quick-action icon/color resolution (manifest carries icon *names*)
// ---------------------------------------------------------------------------

const _quickActionIcons = <String, IconData>{
  'restaurant': Icons.restaurant_rounded,
  'medical_services': Icons.local_hospital_rounded,
  'meeting_room': Icons.meeting_room_rounded,
  'person_add': Icons.person_add_rounded,
  'fingerprint': Icons.fingerprint_rounded,
  'event_busy': Icons.event_busy_rounded,
  'task_alt': Icons.task_alt_rounded,
  'photo_camera': Icons.photo_camera_rounded,
  'cloud_upload': Icons.cloud_upload_rounded,
  'description': Icons.description_rounded,
  'shopping_cart': Icons.shopping_cart_rounded,
  'receipt_long': Icons.receipt_long_rounded,
  'apps': Icons.apps_rounded,
};

IconData quickActionIcon(String iconName) =>
    _quickActionIcons[iconName] ?? Icons.apps_rounded;

const _quickActionColors = <String, Color>{
  'canteen.order.create': Color(0xFFF57C00),
  'helpdesk.ticket.create': Color(0xFF1E88E5),
  'booking.resource.create': Color(0xFF8E24AA),
  'visitor.pass.create': Color(0xFF43A047),
  'attendance.punch.create': Color(0xFF00897B),
  'leave.request.create': Color(0xFFE53935),
  'leave.request.approve': Color(0xFFFB8C00),
  'media.asset.capture': Color(0xFF6D4C41),
  'media.asset.upload': Color(0xFF546E7A),
  'report.daily.submit': Color(0xFF3949AB),
  'finance.purchase.approve': Color(0xFF00ACC1),
  'finance.expense.claim': Color(0xFF7CB342),
};

Color quickActionColor(String actionId) =>
    _quickActionColors[actionId] ?? const Color(0xFF616161);
