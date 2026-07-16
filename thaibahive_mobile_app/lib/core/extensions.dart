import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

extension EmailPhoneValidation on String {
  bool get isEmail {
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,10}$');
    return emailRegex.hasMatch(this);
  }

  bool get isPhone {
    final phoneRegex = RegExp(r'^\+?[\d\s\-()]{7,15}$');
    return phoneRegex.hasMatch(this);
  }
}

extension DateTimeFormatting on DateTime {
  String toDisplayDate() {
    return DateFormat('dd MMM yyyy').format(this);
  }

  String toDisplayTime() {
    return DateFormat('hh:mm a').format(this);
  }

  String toDisplayDateTime() {
    return DateFormat('dd MMM yyyy, hh:mm a').format(this);
  }

  String timeAgo() {
    final now = DateTime.now();
    final difference = now.difference(this);

    if (difference.inDays > 365) {
      return '${(difference.inDays / 365).floor()}y ago';
    } else if (difference.inDays > 30) {
      return '${(difference.inDays / 30).floor()}mo ago';
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'just now';
    }
  }
}

extension BuildContextExtensions on BuildContext {
  ThemeData get theme => Theme.of(this);

  MediaQueryData get mediaQuery => MediaQuery.of(this);

  Size get size => mediaQuery.size;

  double get width => size.width;

  double get height => size.height;

  bool get isDark => theme.brightness == Brightness.dark;
}
