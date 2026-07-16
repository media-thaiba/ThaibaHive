import 'package:badges/badges.dart' as badges;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final List<Widget>? actions;
  final bool showBack;
  final bool showNotification;
  final int notificationCount;
  final bool showSearch;
  final VoidCallback? onNotificationTap;
  final VoidCallback? onSearchTap;
  final Widget? leading;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final PreferredSizeWidget? bottom;

  const CustomAppBar({
    super.key,
    this.title,
    this.actions,
    this.showBack = true,
    this.showNotification = false,
    this.notificationCount = 0,
    this.showSearch = false,
    this.onNotificationTap,
    this.onSearchTap,
    this.leading,
    this.backgroundColor,
    this.foregroundColor,
    this.bottom,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppBar(
      title: title != null ? Text(title!) : null,
      leading: leading ??
          (showBack
              ? IconButton(
                  icon: const Icon(Icons.arrow_back_rounded),
                  onPressed: () => Navigator.maybePop(context),
                )
              : null),
      actions: [
        if (showSearch)
          IconButton(
            icon: const Icon(Icons.search_rounded),
            onPressed: onSearchTap,
          ),
        if (showNotification)
          notificationCount > 0
              ? badges.Badge(
                  position: badges.BadgePosition.topEnd(top: 2, end: 2),
                  badgeContent: Text(
                    notificationCount.toString(),
                    style: const TextStyle(color: Colors.white, fontSize: 10),
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.notifications_outlined),
                    onPressed: onNotificationTap ??
                        () => context.push('/notifications'),
                  ),
                )
              : IconButton(
                  icon: const Icon(Icons.notifications_outlined),
                  onPressed: onNotificationTap ??
                      () => context.push('/notifications'),
                ),
        if (actions != null) ...actions!,
      ],
      backgroundColor: backgroundColor ?? theme.appBarTheme.backgroundColor,
      foregroundColor: foregroundColor ?? theme.appBarTheme.foregroundColor,
      surfaceTintColor: Colors.transparent,
      bottom: bottom,
    );
  }

  @override
  Size get preferredSize => Size.fromHeight(kToolbarHeight + (bottom?.preferredSize.height ?? 0.0));
}
