import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';

import '../core/constants.dart';
import '../features/approvals/presentation/approvals_screen.dart';
import '../features/announcements/presentation/announcements_screen.dart';
import '../features/attendance/presentation/attendance_screen.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/dashboard/presentation/dashboard_screen.dart';
import '../features/auth/presentation/welcome_screen.dart';
import '../features/dashboard/presentation/more_screen.dart';
import '../features/events/presentation/events_screen.dart';
import '../features/leaves/presentation/leave_apply_screen.dart';
import '../features/leaves/presentation/leave_balance_screen.dart';
import '../features/leaves/presentation/leave_detail_screen.dart';
import '../features/leaves/presentation/leaves_screen.dart';
import '../features/notifications/presentation/notifications_screen.dart';
import '../features/recognition/presentation/recognition_screen.dart';
import '../features/reports/presentation/daily_reports_screen.dart';
import '../features/reports/presentation/report_create_screen.dart';
import '../features/settings/presentation/password_change_screen.dart';
import '../features/settings/presentation/profile_edit_screen.dart';
import '../features/settings/presentation/settings_screen.dart';
import '../features/settings/presentation/crash_logs_screen.dart';
import '../features/staff/presentation/staff_directory_screen.dart';
import '../features/staff/presentation/staff_profile_screen.dart';
import '../features/tasks/presentation/task_create_screen.dart';
import '../features/tasks/presentation/task_detail_screen.dart';
import '../features/tasks/presentation/tasks_screen.dart';
import '../features/help_desk/presentation/help_desk_screen.dart';
import '../features/help_desk/presentation/help_desk_ticket_detail_screen.dart';
import '../features/polls/presentation/polls_screen.dart';
import '../features/polls/presentation/poll_detail_screen.dart';
import '../features/circulars/presentation/circulars_screen.dart';
import '../features/bookings/presentation/booking_create_screen.dart';
import '../features/bookings/presentation/bookings_screen.dart';
import '../features/assets/presentation/assets_screen.dart';
import '../features/assets/presentation/asset_detail_screen.dart';
import '../features/expenses/presentation/expenses_screen.dart';
import '../features/purchases/presentation/purchases_screen.dart';
import '../features/visitors/presentation/visitors_screen.dart';
import '../features/vehicles/presentation/vehicles_screen.dart';
import '../features/checklists/presentation/checklists_screen.dart';
import '../features/timeline/presentation/timeline_screen.dart';
import '../features/availability/presentation/availability_screen.dart';
import '../features/accounts/presentation/accounts_screen.dart';
import '../features/admin/presentation/admin_dashboard_screen.dart';
import '../features/grievances/presentation/grievances_screen.dart';
import '../features/grievances/presentation/grievance_submit_screen.dart';
import '../features/canteen/presentation/canteen_screen.dart';
import '../shared/widgets/bottom_nav_bar.dart';
import '../shared/screens/coming_soon_screen.dart';
import '../shared/transitions/page_transitions.dart';

final _storage = const FlutterSecureStorage();

class _ShellRouteData {
  final String path;
  final String name;
  final WidgetBuilder builder;

  const _ShellRouteData({
    required this.path,
    required this.name,
    required this.builder,
  });
}

final List<_ShellRouteData> _shellRoutes = [
  _ShellRouteData(
    path: '/dashboard',
    name: 'dashboard',
    builder: (_) => const DashboardScreen(),
  ),
  _ShellRouteData(
    path: '/attendance',
    name: 'attendance',
    builder: (_) => const AttendanceScreen(),
  ),
  _ShellRouteData(
    path: '/tasks',
    name: 'tasks',
    builder: (_) => const TasksScreen(),
  ),
  _ShellRouteData(
    path: '/leaves',
    name: 'leaves',
    builder: (_) => const LeavesScreen(),
  ),
  _ShellRouteData(
    path: '/more',
    name: 'more',
    builder: (_) => const MoreScreen(),
  ),
];

GoRouter buildRouter() {
  return GoRouter(
    initialLocation: '/',
    debugLogDiagnostics: true,
    redirect: _authGuard,
    routes: [
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
          return LoginScreen(initialMode: mode);
        },
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
      StatefulShellRoute.indexedStack(
        builder: (_, __, navigationShell) => BottomNavShell(
          navigationShell: navigationShell,
        ),
        branches: _shellRoutes.map((r) {
          return StatefulShellBranch(
            routes: [
              GoRoute(
                path: r.path,
                name: r.name,
                builder: (_, __) => r.builder(_),
              ),
            ],
          );
        }).toList(),
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
          child: const ComingSoonScreen(
            title: 'Announcements',
            icon: Icons.campaign_rounded,
          ),
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
          child: const EventsScreen(),
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
        path: '/help-desk',
        name: 'helpDesk',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const HelpDeskScreen(),
        ),
      ),
      GoRoute(
        path: '/help-desk/tickets/:id',
        name: 'helpDeskTicket',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: HelpDeskTicketDetailScreen(
            ticketId: state.pathParameters['id']!,
          ),
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
        path: '/recognition',
        name: 'recognition',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const RecognitionScreen(),
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
        path: '/visitors',
        name: 'visitors',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const VisitorsScreen(),
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
        path: '/vehicles',
        name: 'vehicles',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const VehiclesScreen(),
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
        path: '/settings/diagnostics',
        name: 'settingsDiagnostics',
        pageBuilder: (context, state) => AppTransitions.slide(
          state: state,
          child: const CrashLogsScreen(),
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
    ],
  );
}

Future<String?> _authGuard(BuildContext context, GoRouterState state) async {
  final isAuthRoute = state.matchedLocation.startsWith('/auth');
  final isWelcomeRoute = state.matchedLocation == '/';

  if (isWelcomeRoute) {
    return null;
  }

  final token = await _storage.read(key: AppConstants.storageTokenKey);
  final isLoggedIn = token != null && token.isNotEmpty;

  if (!isLoggedIn && !isAuthRoute) {
    return '/auth/login';
  }

  if (isLoggedIn && isAuthRoute) {
    return '/dashboard';
  }

  return null;
}
