import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/pilot/pilot_gate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';

import '../core/constants.dart';
import '../core/providers/tab_scroll_to_top.dart';
import 'capability_registry.dart' as caps;
import '../core/services/logger_service.dart';
import 'theme.dart';
import '../features/auth/data/auth_state.dart';
import '../models/user_model.dart';
import '../features/action_center/controller.dart';
import '../features/action_center/action_producers.dart';
import '../features/action_center/tray.dart';
import '../shared/widgets/create_action_bottom_sheet.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/auth/presentation/passkey_enrollment_screen.dart';
import '../features/auth/presentation/welcome_screen.dart';
import '../features/auth/presentation/onboarding_affiliation_screen.dart';
import '../features/today/presentation/today_screen.dart';
import '../features/notices/presentation/notices_screen.dart';
import '../features/notifications/data/notifications_provider.dart';
import '../features/notifications/presentation/notifications_screen.dart';
import '../features/services/presentation/services_screen.dart';
import '../features/me/presentation/me_hub_screen.dart';
import '../features/media/presentation/media_screen.dart';

import '../features/attendance/presentation/attendance_screen.dart';
import '../features/leaves/presentation/leaves_screen.dart';
import '../features/leaves/presentation/leave_apply_screen.dart';
import '../features/leaves/presentation/leave_balance_screen.dart';
import '../features/leaves/presentation/leave_detail_screen.dart';
import '../features/canteen/presentation/canteen_screen.dart';
import '../features/visitors/presentation/visitors_screen.dart';
import '../features/visitors/presentation/visitor_gate_verification_screen.dart';
import '../features/help_desk/presentation/help_desk_screen.dart';
import '../features/help_desk/presentation/help_desk_ticket_detail_screen.dart';
import '../features/bookings/presentation/bookings_screen.dart';
import '../features/bookings/presentation/booking_create_screen.dart';
import '../features/tasks/presentation/tasks_screen.dart';
import '../features/tasks/presentation/task_create_screen.dart';
import '../features/tasks/presentation/task_detail_screen.dart';
import '../features/expenses/presentation/expenses_screen.dart';
import '../features/purchases/presentation/purchases_screen.dart';
import '../features/finance/presentation/finance_screen.dart';
import '../features/finance/presentation/purchase_approvals_screen.dart';
import '../features/finance/presentation/purchase_approval_detail_screen.dart';
import '../features/finance/presentation/reconciliation_screen.dart';
import '../features/finance/presentation/reconciliation_detail_screen.dart';
import '../features/settings/presentation/settings_screen.dart';
import '../features/settings/presentation/profile_edit_screen.dart';
import '../features/settings/presentation/password_change_screen.dart';
import '../features/settings/presentation/crash_logs_screen.dart';
import '../features/settings/presentation/about_screen.dart';
import '../features/recognition/presentation/biometric_enrollment_screen.dart';
import '../features/recognition/presentation/recognition_screen.dart';
import '../features/announcements/presentation/announcements_screen.dart';
import '../features/announcements/presentation/announcement_detail_screen.dart';
import '../features/circulars/presentation/circulars_screen.dart';
import '../features/polls/presentation/polls_screen.dart';
import '../features/polls/presentation/poll_detail_screen.dart';
import '../features/events/presentation/events_screen.dart';
import '../features/events/presentation/event_detail_screen.dart';
import '../features/reports/presentation/daily_reports_screen.dart';
import '../features/reports/presentation/report_create_screen.dart';
import '../features/approvals/presentation/approvals_screen.dart';
import '../features/conferencing/screens/conference_room_screen.dart';
import '../features/checklists/presentation/checklists_screen.dart';
import '../features/timeline/presentation/timeline_screen.dart';
import '../features/availability/presentation/availability_screen.dart';
import '../features/accounts/presentation/accounts_screen.dart';
import '../features/admin/presentation/admin_dashboard_screen.dart';
import '../features/admin/presentation/nfc_tag_management_screen.dart';
import '../features/admin/presentation/location_qr_management_screen.dart';
import '../features/admin/presentation/beacon_management_screen.dart';
import '../features/assets/presentation/assets_screen.dart';
import '../features/assets/presentation/asset_detail_screen.dart';
import '../features/assets/presentation/asset_tagging_screen.dart';
import '../features/grievances/presentation/grievances_screen.dart';
import '../features/grievances/presentation/grievance_submit_screen.dart';
import '../features/vehicles/presentation/vehicles_screen.dart';
import '../features/staff/presentation/staff_directory_screen.dart';
import '../features/staff/presentation/staff_profile_screen.dart';
import '../features/facility/screens/technician_workorder_screen.dart';
import '../features/facility/screens/qr_asset_scanner_screen.dart';
import '../features/agent_hub/presentation/agent_hub_screen.dart';
import '../features/agent_hub/presentation/plugin_detail_screen.dart';
import '../features/sync/presentation/sync_status_screen.dart';
import '../features/chat/presentation/channel_list_screen.dart';
import '../shared/widgets/update_banner.dart';
import '../shared/widgets/ambient_canvas_background.dart';
import '../features/chat/presentation/chat_screen.dart';
import '../features/hardware/presentation/guard_patrol_screen.dart';
import '../features/hardware/presentation/hardware_radar_screen.dart';
import '../shared/screens/webview_handoff_screen.dart';
import '../shared/transitions/page_transitions.dart';

final _storage = const FlutterSecureStorage();

class DiagnosticsNavigatorObserver extends NavigatorObserver {
  String _formatRouteName(Route<dynamic>? route, [String fallback = 'unknown']) {
    if (route == null) return fallback;
    final name = route.settings.name;
    if (name != null && name.isNotEmpty) return name;
    final args = route.settings.arguments;
    if (args is String && args.startsWith('/')) return args;
    return route.runtimeType.toString();
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    final routeName = _formatRouteName(route, 'route');
    final prevName = _formatRouteName(previousRoute, 'initial');
    logger.info('NAVIGATION: Pushed $routeName (previous: $prevName)');
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPop(route, previousRoute);
    final routeName = _formatRouteName(route, 'route');
    final currentName = _formatRouteName(previousRoute, 'none');
    logger.info('NAVIGATION: Popped $routeName (current: $currentName)');
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    final oldName = _formatRouteName(oldRoute, 'previous');
    final newName = _formatRouteName(newRoute, 'next');
    logger.info('NAVIGATION: Replaced $oldName with $newName');
  }
}

/// Build the router with dynamic tabs based on user capabilities
GoRouter buildRouter() {
  return GoRouter(
    initialLocation: '/',
    debugLogDiagnostics: true,
    observers: [DiagnosticsNavigatorObserver()],
    redirect: _authGuard,
    routes: [
      // Public routes
      GoRoute(
        path: '/',
        name: 'welcome',
        builder: (_, __) => const WelcomeScreen(),
      ),
      GoRoute(
        path: '/auth/login',
        name: 'login',
        builder: (context, state) {
          final mode = state.uri.queryParameters['mode'];
          final redirect = state.uri.queryParameters['redirect'];
          return LoginScreen(initialMode: mode, redirect: redirect);
        },
      ),
      GoRoute(
        path: '/onboarding/affiliate',
        name: 'onboardingAffiliate',
        builder: (_, __) => const OnboardingAffiliationScreen(),
      ),
      GoRoute(
        path: '/auth/passkey/enroll',
        name: 'passkeyEnroll',
        builder: (_, __) => const PasskeyEnrollmentScreen(),
      ),
      GoRoute(
        path: '/auth/diagnostics',
        name: 'authDiagnostics',
        builder: (_, __) => const CrashLogsScreen(),
      ),
      GoRoute(
        path: '/auth/signup',
        name: 'signup',
        redirect: (context, state) => '/auth/login?mode=signup',
      ),
      GoRoute(
        path: '/dashboard',
        redirect: (context, state) => '/today',
      ),
      GoRoute(
        path: '/home',
        redirect: (context, state) => '/today',
      ),

      // Dynamic StatefulShellRoute - tabs based on capabilities
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => _DynamicBottomNavShell(
          navigationShell: navigationShell,
        ),
        branches: _buildShellBranches(),
      ),

      // Detail routes
      GoRoute(
        path: '/share/:token',
        name: 'shareLink',
        pageBuilder: (context, state) {
          final token = state.pathParameters['token']!;
          return AppTransitions.slide(
            state: state,
            child: WebViewHandoffScreen(
              targetPath: '/share/$token',
              title: 'Shared File',
            ),
          );
        },
      ),
      GoRoute(
        path: '/me/attendance',
        name: 'meAttendance',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const AttendanceScreen(),
        ),
      ),
      GoRoute(
        path: '/me/leaves/balance',
        name: 'meLeaveBalance',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const LeaveBalanceScreen(),
        ),
      ),
      GoRoute(
        path: '/me/leaves',
        name: 'meLeaves',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const LeavesScreen(),
        ),
      ),
      GoRoute(
        path: '/me/leaves/apply',
        name: 'meLeaveApply',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const LeaveApplyScreen(),
        ),
      ),
      GoRoute(
        path: '/leaves',
        name: 'leaves',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const LeavesScreen(),
        ),
      ),
      GoRoute(
        path: '/leaves/apply',
        name: 'leaveApply',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const LeaveApplyScreen(),
        ),
      ),
      GoRoute(
        path: '/leaves/balance',
        name: 'leaveBalance',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const LeaveBalanceScreen(),
        ),
      ),
      GoRoute(
        path: '/leaves/:id',
        name: 'leaveDetail',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: LeaveDetailScreen(
            id: state.pathParameters['id']!,
          ),
        ),
      ),
      GoRoute(
        path: '/canteen',
        name: 'canteen',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const CanteenScreen(),
        ),
      ),
      GoRoute(
        path: '/visitors',
        name: 'visitors',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const VisitorsScreen(),
        ),
      ),
      GoRoute(
        path: '/visitors/gate-verify',
        name: 'visitorGateVerify',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const VisitorGateVerificationScreen(),
        ),
      ),
      GoRoute(
        path: '/help-desk',
        name: 'helpDesk',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const HelpDeskScreen(),
        ),
      ),
      GoRoute(
        path: '/chat',
        name: 'chatChannels',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const ChannelListScreen(),
        ),
      ),
      GoRoute(
        path: '/chat/:id',
        name: 'chatRoom',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: ChatScreen(
            channelId: state.pathParameters['id']!,
          ),
        ),
      ),
      GoRoute(
        path: '/help-desk/:id',
        name: 'helpDeskTicketDetail',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: HelpDeskTicketDetailScreen(
            ticketId: state.pathParameters['id']!,
          ),
        ),
      ),
      GoRoute(
        path: '/bookings',
        name: 'bookings',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const BookingsScreen(),
        ),
      ),
      GoRoute(
        path: '/bookings/create',
        name: 'bookingCreate',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const BookingCreateScreen(),
        ),
      ),
      GoRoute(
        path: '/tasks',
        name: 'tasks',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const TasksScreen(),
        ),
      ),
      GoRoute(
        path: '/tasks/create',
        name: 'taskCreate',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const TaskCreateScreen(),
        ),
      ),
      GoRoute(
        path: '/tasks/:id',
        name: 'taskDetail',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: TaskDetailScreen(
            taskId: state.pathParameters['id']!,
          ),
        ),
      ),
      GoRoute(
        path: '/expenses',
        name: 'expenses',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const ExpensesScreen(),
        ),
      ),
      GoRoute(
        path: '/purchases',
        name: 'purchases',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const PurchasesScreen(),
        ),
      ),
      GoRoute(
        path: '/finance',
        name: 'finance',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const FinanceScreen(),
        ),
      ),
      GoRoute(
        path: '/finance/approvals',
        name: 'financeApprovals',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const PurchaseApprovalsScreen(),
        ),
      ),
      GoRoute(
        path: '/finance/approvals/:id',
        name: 'financeApprovalDetail',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: PurchaseApprovalDetailScreen(
            purchaseRequestId: state.pathParameters['id']!,
          ),
        ),
      ),
      GoRoute(
        path: '/finance/reconciliation',
        name: 'financeReconciliation',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const ReconciliationScreen(),
        ),
      ),
      GoRoute(
        path: '/finance/reconciliation/:id',
        name: 'financeReconciliationDetail',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: ReconciliationDetailScreen(
            reconciliationId: state.pathParameters['id']!,
          ),
        ),
      ),
      GoRoute(
        path: '/settings',
        name: 'settings',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const SettingsScreen(),
        ),
      ),
      GoRoute(
        path: '/settings/profile',
        name: 'profileEdit',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const ProfileEditScreen(),
        ),
      ),
      GoRoute(
        path: '/settings/password',
        name: 'passwordChange',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const PasswordChangeScreen(),
        ),
      ),
      GoRoute(
        path: '/settings/about',
        name: 'settingsAbout',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const AboutScreen(),
        ),
      ),
      // ── My Hub menu-item fallbacks ────────────────────────────────────────
      // These paths are pushed from _MenuItem rows in MeHubScreen. Until each
      // gets a dedicated screen they land on /settings so a tap never throws
      // GoException "no routes for location".
      GoRoute(
        path: '/settings/notifications',
        redirect: (context, state) => '/settings',
      ),
      GoRoute(
        path: '/settings/display',
        redirect: (context, state) => '/settings',
      ),
      GoRoute(
        path: '/settings/sync',
        redirect: (context, state) => '/settings',
      ),
      // "Biometric & Security" has a real destination already — the
      // BiometricEnrollmentScreen at /biometric/enrollment — so send it there
      // rather than back to the settings index.
      GoRoute(
        path: '/settings/biometric',
        redirect: (context, state) => '/biometric/enrollment',
      ),
      GoRoute(
        path: '/biometric/enrollment',
        name: 'biometricEnrollment',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const BiometricEnrollmentScreen(),
        ),
      ),
      GoRoute(
        path: '/recognition',
        name: 'recognition',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const RecognitionScreen(),
        ),
      ),
      GoRoute(
        path: '/announcements',
        name: 'announcements',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const AnnouncementsScreen(),
        ),
      ),
      GoRoute(
        path: '/announcements/:id',
        name: 'announcementDetail',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: AnnouncementDetailScreen(
            id: state.pathParameters['id']!,
          ),
        ),
      ),
      GoRoute(
        path: '/circulars',
        name: 'circulars',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const CircularsScreen(),
        ),
      ),
      GoRoute(
        path: '/polls',
        name: 'polls',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const PollsScreen(),
        ),
      ),
      GoRoute(
        path: '/polls/:id',
        name: 'pollDetail',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: PollDetailScreen(
            pollId: state.pathParameters['id']!,
          ),
        ),
      ),
      GoRoute(
        path: '/services',
        name: 'services',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const ServicesScreen(),
        ),
      ),
      GoRoute(
        path: '/notifications',
        name: 'notifications',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const NotificationsScreen(),
        ),
      ),
      GoRoute(
        path: '/events',
        name: 'events',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const EventsScreen(),
        ),
      ),
      GoRoute(
        path: '/events/:id',
        name: 'eventDetail',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: EventDetailScreen(
            id: state.pathParameters['id']!,
          ),
        ),
      ),
      GoRoute(
        path: '/reports',
        name: 'reports',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const DailyReportsScreen(),
        ),
      ),
      GoRoute(
        path: '/reports/create',
        name: 'reportCreate',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const ReportCreateScreen(),
        ),
      ),
      GoRoute(
        path: '/approvals',
        name: 'approvals',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const ApprovalsScreen(),
        ),
      ),
      GoRoute(
        path: '/checklists',
        name: 'checklists',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const ChecklistsScreen(),
        ),
      ),
      GoRoute(
        path: '/timeline',
        name: 'timeline',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const TimelineScreen(),
        ),
      ),
      GoRoute(
        path: '/availability',
        name: 'availability',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const AvailabilityScreen(),
        ),
      ),
      GoRoute(
        path: '/accounts',
        name: 'accounts',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const AccountsScreen(),
        ),
      ),
      GoRoute(
        path: '/admin',
        name: 'admin',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const AdminDashboardScreen(),
        ),
      ),
      GoRoute(
        path: '/admin/nfc-tags',
        name: 'adminNfcTags',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const NfcTagManagementScreen(),
        ),
      ),
      GoRoute(
        path: '/admin/location-qr',
        name: 'adminLocationQr',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const LocationQrManagementScreen(),
        ),
      ),
      GoRoute(
        path: '/admin/beacons',
        name: 'adminBeacons',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const BeaconManagementScreen(),
        ),
      ),
      GoRoute(
        path: '/assets',
        name: 'assets',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const AssetsScreen(),
        ),
      ),
      GoRoute(
        path: '/assets/tagging',
        name: 'assetTagging',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const AssetTaggingScreen(),
        ),
      ),
      GoRoute(
        path: '/assets/:id',
        name: 'assetDetail',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: AssetDetailScreen(
            assetId: state.pathParameters['id']!,
          ),
        ),
      ),
      GoRoute(
        path: '/grievances',
        name: 'grievances',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const GrievancesScreen(),
        ),
      ),
      GoRoute(
        path: '/grievances/submit',
        name: 'grievanceSubmit',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const GrievanceSubmitScreen(),
        ),
      ),
      GoRoute(
        path: '/vehicles',
        name: 'vehicles',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const VehiclesScreen(),
        ),
      ),
      GoRoute(
        path: '/staff',
        name: 'staff',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const StaffDirectoryScreen(),
        ),
      ),
      GoRoute(
        path: '/staff/:id',
        name: 'staffProfile',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: StaffProfileScreen(
            id: state.pathParameters['id']!,
          ),
        ),
      ),
      GoRoute(
        path: '/technician/workorders',
        name: 'technicianWorkOrders',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const TechnicianWorkOrderScreen(),
        ),
      ),
      GoRoute(
        path: '/technician/scan',
        name: 'technicianScan',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const QrAssetScannerScreen(),
        ),
      ),
      GoRoute(
        path: '/agent-hub',
        name: 'agentHub',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: AgentHubScreen(
            initialGateId: state.uri.queryParameters['gateId'],
          ),
        ),
      ),
      GoRoute(
        path: '/agent-hub/plugins/:id',
        name: 'agentPluginDetail',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: PluginDetailScreen(
            pluginId: state.pathParameters['id']!,
          ),
        ),
      ),
      GoRoute(
        path: '/sync-status',
        name: 'syncStatus',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const SyncStatusScreen(),
        ),
      ),
      GoRoute(
        path: '/radar',
        name: 'hardwareRadar',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const HardwareRadarScreen(),
        ),
      ),
      GoRoute(
        path: '/guard-patrol',
        name: 'guardPatrol',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const GuardPatrolScreen(),
        ),
      ),
      GoRoute(
        path: '/operations/radar',
        redirect: (context, state) => '/radar',
      ),
      GoRoute(
        path: '/operations/guard-patrol',
        redirect: (context, state) => '/guard-patrol',
      ),

      // ─── Workspace: My Work Aliases ───
      GoRoute(
        path: '/my-work/tasks',
        redirect: (context, state) => '/tasks',
      ),
      GoRoute(
        path: '/my-work/tasks/new',
        redirect: (context, state) => '/tasks/create',
      ),
      GoRoute(
        path: '/my-work/tasks/:id',
        redirect: (context, state) => '/tasks/${state.pathParameters['id']}',
      ),
      GoRoute(
        path: '/my-work/leaves',
        redirect: (context, state) => '/leaves',
      ),
      GoRoute(
        path: '/my-work/leaves/apply',
        redirect: (context, state) => '/leaves/apply',
      ),
      GoRoute(
        path: '/my-work/leaves/balance',
        redirect: (context, state) => '/leaves/balance',
      ),
      GoRoute(
        path: '/my-work/leaves/:id',
        redirect: (context, state) => '/leaves/${state.pathParameters['id']}',
      ),
      GoRoute(
        path: '/my-work/attendance',
        redirect: (context, state) => '/attendance',
      ),
      GoRoute(
        path: '/my-work/announcements',
        redirect: (context, state) => '/announcements',
      ),
      GoRoute(
        path: '/my-work/announcements/:id',
        redirect: (context, state) => '/announcements/${state.pathParameters['id']}',
      ),
      GoRoute(
        path: '/my-work/approvals',
        redirect: (context, state) => '/approvals',
      ),
      GoRoute(
        path: '/my-work/events',
        redirect: (context, state) => '/events',
      ),
      GoRoute(
        path: '/my-work/events/:id',
        redirect: (context, state) => '/events/${state.pathParameters['id']}',
      ),
      GoRoute(
        path: '/my-work/expenses',
        redirect: (context, state) => '/expenses',
      ),
      GoRoute(
        path: '/my-work/reports',
        redirect: (context, state) => '/reports',
      ),
      GoRoute(
        path: '/my-work/reports/new',
        redirect: (context, state) => '/reports/create',
      ),
      GoRoute(
        path: '/my-work/canteen',
        redirect: (context, state) => '/canteen',
      ),
      GoRoute(
        path: '/my-work/polls',
        redirect: (context, state) => '/polls',
      ),
      GoRoute(
        path: '/my-work/polls/:id',
        redirect: (context, state) => '/polls/${state.pathParameters['id']}',
      ),
      GoRoute(
        path: '/my-work/grievances',
        redirect: (context, state) => '/grievances',
      ),
      GoRoute(
        path: '/my-work/timeline',
        redirect: (context, state) => '/timeline',
      ),
      GoRoute(
        path: '/my-work/availability',
        redirect: (context, state) => '/availability',
      ),
      GoRoute(
        path: '/my-work/settings',
        redirect: (context, state) => '/settings',
      ),
      GoRoute(
        path: '/my-work/chat',
        redirect: (context, state) => '/agent-hub',
      ),

      // ─── Workspace: Operations Aliases ───
      GoRoute(
        path: '/operations/assets',
        redirect: (context, state) => '/assets',
      ),
      GoRoute(
        path: '/operations/assets/:id',
        redirect: (context, state) => '/assets/${state.pathParameters['id']}',
      ),
      GoRoute(
        path: '/operations/bookings',
        redirect: (context, state) => '/bookings',
      ),
      GoRoute(
        path: '/operations/bookings/create',
        redirect: (context, state) => '/bookings/create',
      ),
      GoRoute(
        path: '/operations/bookings/:id',
        redirect: (context, state) => '/bookings/${state.pathParameters['id']}',
      ),
      GoRoute(
        path: '/operations/media-library',
        redirect: (context, state) => '/media',
      ),
      GoRoute(
        path: '/operations/visitors',
        redirect: (context, state) => '/visitors',
      ),
      GoRoute(
        path: '/operations/fleet',
        redirect: (context, state) => '/vehicles',
      ),
      GoRoute(
        path: '/operations/accounts',
        redirect: (context, state) => '/accounts',
      ),
      GoRoute(
        path: '/operations/procurement',
        redirect: (context, state) => '/purchases',
      ),
      GoRoute(
        path: '/operations/finance/purchases',
        redirect: (context, state) => '/finance/purchase-approvals',
      ),
      GoRoute(
        path: '/operations/finance/purchases/:id',
        redirect: (context, state) => '/finance/purchase-approvals/${state.pathParameters['id']}',
      ),
      GoRoute(
        path: '/operations/finance/reconciliation',
        redirect: (context, state) => '/finance/reconciliation',
      ),
      GoRoute(
        path: '/operations/finance/reconciliation/:id',
        redirect: (context, state) => '/finance/reconciliation/${state.pathParameters['id']}',
      ),
      GoRoute(
        path: '/operations/finance',
        redirect: (context, state) => '/finance',
      ),
      GoRoute(
        path: '/conferencing/:id',
        pageBuilder: (context, state) {
          final roomId = state.pathParameters['id'] ?? '';
          final roomName = state.uri.queryParameters['name'] ?? 'Campus Conference Room';
          return AppTransitions.slide(
            state: state,
            child: ConferenceRoomScreen(
              roomId: roomId,
              roomName: roomName,
            ),
          );
        },
      ),

      // ─── Generic Dynamic Handoff Route ───
      GoRoute(
        path: '/handoff',
        name: 'handoff',
        pageBuilder: (context, state) {
          final target = state.uri.queryParameters['path'] ?? state.uri.queryParameters['targetPath'] ?? '/';
          final title = state.uri.queryParameters['title'] ?? 'ThaibaHive';
          return AppTransitions.slide(
            state: state,
            child: WebViewHandoffScreen(
              targetPath: target,
              title: title,
            ),
          );
        },
      ),

      // ─── Web-Only Tier-3 Catch-all Routes ───
      GoRoute(
        path: '/school/:path*',
        pageBuilder: (context, state) {
          final path = state.uri.path;
          return AppTransitions.slide(
            state: state,
            child: WebViewHandoffScreen(
              targetPath: path,
              title: 'School Workspace',
            ),
          );
        },
      ),
      GoRoute(
        path: '/admin/:path*',
        pageBuilder: (context, state) {
          final path = state.uri.path;
          return AppTransitions.slide(
            state: state,
            child: WebViewHandoffScreen(
              targetPath: path,
              title: 'Admin Console',
            ),
          );
        },
      ),
    ],
  );
}

/// Build shell branches dynamically
List<StatefulShellBranch> _buildShellBranches() {
  return [
    // Branch 0: Today
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: '/today',
          name: 'today',
          builder: (_, __) => const TodayScreen(),
        ),
      ],
    ),
    // Branch 1: Attendance (Core V1.0 Pilot Tab)
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: '/attendance',
          name: 'attendance',
          pageBuilder: (context, state) => AppTransitions.slide(
            state: state,
            child: const AttendanceScreen(),
          ),
        ),
      ],
    ),
    // Branch 2: Notices (Core V1.0 Pilot Tab)
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: '/notices',
          name: 'notices',
          builder: (_, __) => const NoticesScreen(),
        ),
      ],
    ),
    // Branch 3: My Hub / Profile (Core V1.0 Pilot Tab)
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: '/me',
          name: 'me',
          builder: (_, __) => const MeHubScreen(),
        ),
      ],
    ),
    // Branch 4: Diagnostics (Core V1.0 Pilot Tab)
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: '/settings/diagnostics',
          name: 'settingsDiagnostics',
          pageBuilder: (context, state) => AppTransitions.slide(
            state: state,
            child: const CrashLogsScreen(),
          ),
        ),
      ],
    ),
    // Branch 5: Media (Legacy / Post-pilot conditional)
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: '/media',
          name: 'media',
          pageBuilder: (context, state) => AppTransitions.slide(
            state: state,
            child: const MediaScreen(),
          ),
        ),
      ],
    ),
  ];
}

String? _cachedToken;

void updateCachedAuthToken(String? token) {
  _cachedToken = token;
}

void clearCachedAuthToken() {
  _cachedToken = null;
}

Future<String?> _authGuard(BuildContext context, GoRouterState state) async {
  final isAuthRoute = state.matchedLocation.startsWith('/auth');
  final isWelcomeRoute = state.matchedLocation == '/';
  final isOnboardingRoute = state.matchedLocation == '/onboarding/affiliate';

  // Use cached token for zero-latency route transitions; fallback to storage on cold start.
  final token = _cachedToken ?? await _storage.read(key: AppConstants.storageTokenKey);
  if (token != null && token.isNotEmpty) {
    _cachedToken = token;
  } else {
    _cachedToken = null;
  }

  final isLoggedIn = token != null && token.isNotEmpty;

  if (isWelcomeRoute) {
    if (isLoggedIn) {
      final isFirstLogin = await _storage.read(key: 'is_first_login');
      if (isFirstLogin == 'true') {
        return '/onboarding/affiliate';
      }
      return '/today';
    }
    return null;
  }

  // Pilot freeze guard: block access to frozen modules in V1.0 pilot
  if (isLoggedIn && isFrozenPath(state.matchedLocation)) {
    logger.info('AUTH GUARD: Blocked access to frozen pilot route ${state.matchedLocation} -> /today');
    return '/today?error=module_frozen';
  }

  if (!isLoggedIn && !isAuthRoute && !isOnboardingRoute) {
    logger.info('AUTH GUARD: Unauthenticated access to ${state.matchedLocation} -> redirecting to login');
    final target = state.uri.toString();
    if (target.isNotEmpty && target != '/' && target != '/today' && target != '/dashboard') {
      return '/auth/login?redirect=${Uri.encodeComponent(target)}';
    }
    return '/auth/login';
  }

  if (isLoggedIn && isAuthRoute) {
    logger.info('AUTH GUARD: Already authenticated -> redirecting from ${state.matchedLocation}');
    final redirectParam = state.uri.queryParameters['redirect'];
    if (redirectParam != null && redirectParam.isNotEmpty && redirectParam.startsWith('/')) {
      return redirectParam;
    }
    // First-login users go to onboarding, not /today
    final isFirstLogin = await _storage.read(key: 'is_first_login');
    if (isFirstLogin == 'true') {
      return '/onboarding/affiliate';
    }
    return '/today';
  }

  // First-login guard: redirect to onboarding unless already there
  if (isLoggedIn && !isOnboardingRoute) {
    final isFirstLogin = await _storage.read(key: 'is_first_login');
    if (isFirstLogin == 'true') {
      logger.info('AUTH GUARD: First-login user redirected to onboarding');
      return '/onboarding/affiliate';
    }
  }

  return null;
}

/// Dynamic bottom navigation shell that shows/hides tabs based on capabilities
class _DynamicBottomNavShell extends ConsumerStatefulWidget {
  final StatefulNavigationShell navigationShell;

  const _DynamicBottomNavShell({
    required this.navigationShell,
  });

  @override
  ConsumerState<_DynamicBottomNavShell> createState() => _DynamicBottomNavShellState();
}

class _DynamicBottomNavShellState extends ConsumerState<_DynamicBottomNavShell> {
  DateTime? _lastBackPressTime;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Surface pilot freeze toast if redirected with error=module_frozen
    final queryError = GoRouterState.of(context).uri.queryParameters['error'];
    if (queryError == 'module_frozen') {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ScaffoldMessenger.of(context).removeCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('This module is frozen during the Version 1.0 Pilot.'),
            backgroundColor: Color(0xFFC05621),
            behavior: SnackBarBehavior.floating,
            duration: Duration(seconds: 3),
          ),
        );
      });
    }

    // Get user capabilities from auth state
    final authState = ref.watch(authProvider);
    final user = authState.user;
    // D7*: registry-backed check; `media.asset.view` gates the Media tab.
    final hasMediaCapability = _hasCapability(user, 'media.asset.view');
    // Start the action-center producers (pull + SSE + FCM) once for the whole
    // shell; the provider is disposed only when the app tears down.
    ref.watch(actionCenterBootstrapProvider);
    final pendingActionCount = ref.watch(pendingActionCountProvider);
    // Tray renders on visible items (pending + snoozed + acknowledged);
    // badges/FAB count pending + snoozed only.
    final visibleActionCount = ref.watch(visibleActionCountProvider);
    final unreadCount = ref.watch(unreadCountProvider).valueOrNull ?? 0;
    final onTodayBranch = widget.navigationShell.currentIndex == 0;

    // Build dynamic tab list: 5 Core V1.0 Pilot Tabs
    final tabs = isPilotActive
        ? [
            const _TabData(
              branchIndex: 0,
              icon: Icons.today_outlined,
              selectedIcon: Icons.today_rounded,
              label: 'Today',
            ),
            const _TabData(
              branchIndex: 1,
              icon: Icons.access_time_rounded,
              selectedIcon: Icons.access_time_filled_rounded,
              label: 'Attendance',
            ),
            const _TabData(
              branchIndex: 2,
              icon: Icons.campaign_outlined,
              selectedIcon: Icons.campaign_rounded,
              label: 'Bulletin',
            ),
            const _TabData(
              branchIndex: 4,
              icon: Icons.terminal_outlined,
              selectedIcon: Icons.terminal_rounded,
              label: 'Diagnostics',
            ),
            const _TabData(
              branchIndex: 3,
              icon: Icons.person_outline_rounded,
              selectedIcon: Icons.person_rounded,
              label: 'My Hub',
            ),
          ]
        : [
            const _TabData(
              branchIndex: 0,
              icon: Icons.today_rounded,
              selectedIcon: Icons.today_rounded,
              label: 'Today',
            ),
            const _TabData(
              branchIndex: 2,
              icon: Icons.campaign_outlined,
              selectedIcon: Icons.campaign_rounded,
              label: 'Bulletin',
            ),
            if (hasMediaCapability)
              const _TabData(
                branchIndex: 5,
                icon: Icons.photo_library_rounded,
                selectedIcon: Icons.photo_library_rounded,
                label: 'Media',
              ),
            const _TabData(
              branchIndex: 3,
              icon: Icons.person_rounded,
              selectedIcon: Icons.person_rounded,
              label: 'My Hub',
            ),
          ];

    // Rule 3: the Create (+) action owns a dedicated center slot so it is
    // always the middle destination of the dock — and never a navigation
    // target, since its tap opens the quick-action sheet instead.
    final createSlotIndex = (tabs.length + 1) ~/ 2;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final currentBranch = widget.navigationShell.currentIndex;
        if (currentBranch != 0) {
          widget.navigationShell.goBranch(0);
          return;
        }
        final now = DateTime.now();
        if (_lastBackPressTime == null || now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
          _lastBackPressTime = now;
          ScaffoldMessenger.of(context).removeCurrentSnackBar();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Press back again to exit'),
              duration: Duration(seconds: 2),
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else {
          await SystemNavigator.pop();
        }
      },
      child: Scaffold(
      backgroundColor: isDark ? const Color(0xFF171A17) : const Color(0xFFF4F7F4),
      // Single tray + single FAB layer, Today branch only (D5*).
      floatingActionButton: onTodayBranch && pendingActionCount > 0
          ? const ActionCenterFab()
          : null,
      body: Stack(
        children: [
          // ── Ambient canvas shader — living gradient behind all content ──
          Positioned.fill(
            child: IgnorePointer(
              child: AmbientCanvasBackground(isDark: isDark),
            ),
          ),

          // Main navigation content
          widget.navigationShell,

          // Persistent In-App OTA Update Banner (Mounted like MediaHive shell)
          const Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: UpdateBanner(),
            ),
          ),

          // Action Center Tray overlay (visible items; Today branch only)
          if (onTodayBranch && visibleActionCount > 0)
            const Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: ActionCenterTray(),
            ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.section,
          0,
          AppSpacing.section,
          AppSpacing.normal,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.card),
          child: BackdropFilter(
            filter: ImageFilter.blur(
              sigmaX: AppBlur.chrome,
              sigmaY: AppBlur.chrome,
            ),
            child: Container(
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF22262b).withValues(alpha: 0.88)
                    : Colors.white.withValues(alpha: 0.90),
                borderRadius: BorderRadius.circular(AppRadius.card),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : const Color(0xFFd4dbd4).withValues(alpha: 0.6),
                  width:
                      isDark ? AppBorder.hairlineDark : AppBorder.hairline,
                ),
                boxShadow: AppShadows.chrome(Colors.black),
              ),
              child: NavigationBar(
                selectedIndex: _destinationIndex(tabs, createSlotIndex),
                backgroundColor: Colors.transparent,
                surfaceTintColor: Colors.transparent,
                shadowColor: Colors.transparent,
                elevation: AppElevation.level0,
                height: 60,
                onDestinationSelected: (destIndex) {
                  HapticFeedback.lightImpact();
                  // Center Create (+) slot (Rule 3): open the quick-action
                  // sheet instead of switching branches.
                  if (destIndex == createSlotIndex) {
                    CreateActionBottomSheet.show(context);
                    return;
                  }
                  final targetBranch = tabs[destIndex > createSlotIndex
                          ? destIndex - 1
                          : destIndex]
                      .branchIndex;
                  // Rule 9: re-tapping the active tab scrolls it to the top.
                  if (targetBranch == widget.navigationShell.currentIndex) {
                    ref
                        .read(tabScrollToTopProvider.notifier)
                        .trigger(targetBranch);
                  }
                  widget.navigationShell.goBranch(
                    targetBranch,
                    initialLocation: targetBranch == widget.navigationShell.currentIndex,
                  );
                },
                destinations: [
                  for (int i = 0; i < tabs.length; i++) ...[
                    if (i == createSlotIndex) _buildCreateDestination(theme),
                    _buildTabDestination(
                      tabs[i],
                      pendingActionCount,
                      unreadCount,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
        ),
      ),
    ),
    );
  }

  /// Index inside the dock's destination list (tabs + Create slot) that
  /// matches the active branch. The Create slot is skipped so it can never
  /// render as the selected destination.
  int _destinationIndex(List<_TabData> tabs, int createSlotIndex) {
    final currentBranch = widget.navigationShell.currentIndex;
    for (int i = 0; i < tabs.length; i++) {
      if (tabs[i].branchIndex == currentBranch) {
        return i < createSlotIndex ? i : i + 1;
      }
    }
    return 0;
  }

  /// Tab destination with the D12* badges: pending actions on Today,
  /// unread notifications on Notices.
  NavigationDestination _buildTabDestination(
    _TabData tab,
    int pendingActionCount,
    int unreadCount,
  ) {
    final badgeCount = switch (tab.branchIndex) {
      0 => pendingActionCount,
      2 => unreadCount,
      _ => 0,
    };
    return NavigationDestination(
      icon: badgeCount > 0
          ? Badge(
              label: Text('$badgeCount'),
              child: Icon(tab.icon),
            )
          : Icon(tab.icon),
      selectedIcon: badgeCount > 0
          ? Badge(
              label: Text('$badgeCount'),
              child: Icon(tab.selectedIcon),
            )
          : Icon(tab.selectedIcon),
      label: tab.label,
    );
  }

  /// Center Create (+) action (Rule 3): renders as a raised circular button
  /// so it reads as an action rather than a navigation destination.
  NavigationDestination _buildCreateDestination(ThemeData theme) {
    final color = theme.colorScheme.primary;
    return NavigationDestination(
      icon: Container(
        width: 30,
        height: 30,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          shape: BoxShape.circle,
        ),
        child: Icon(Icons.add_rounded, size: 20, color: color),
      ),
      label: 'Create',
    );
  }

  /// Registry-backed capability check (D7*): consults the mirrored
  /// `packages/auth/capabilities.ts` role sets; unknown capabilities or a
  /// missing role return false.
  bool _hasCapability(UserModel? user, String capability) {
    return caps.hasCapability(user?.role, capability);
  }
}

class _TabData {
  final int branchIndex;
  final IconData icon;
  final IconData selectedIcon;
  final String label;

  const _TabData({
    required this.branchIndex,
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });
}