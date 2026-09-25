class FeePushNotificationHandler {
  static void handleNotificationPayload(Map<String, dynamic> data, Function(String route, dynamic extra) navigate) {
    final type = data['type'];
    if (type == 'fee_due_reminder') {
      navigate('/fees/dashboard', null);
    } else if (type == 'payment_confirmed') {
      final receiptNumber = data['receiptNumber'];
      navigate('/fees/dashboard', {'highlightReceipt': receiptNumber});
    }
  }
}
