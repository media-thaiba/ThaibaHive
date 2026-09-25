import 'dart:convert';
import '../models/fee_models.dart';

class FeeOfflineStorage {
  static final Map<String, String> _cache = {};

  static Future<void> saveReceipt(MobileFeeReceipt receipt) async {
    _cache[receipt.receiptNumber] = jsonEncode({
      'receiptNumber': receipt.receiptNumber,
      'paymentId': receipt.paymentId,
      'studentId': receipt.studentId,
      'amount': receipt.amount,
      'paymentMethod': receipt.paymentMethod,
      'receiptHash': receipt.receiptHash,
      'issuedAt': receipt.issuedAt,
    });
  }

  static Future<List<MobileFeeReceipt>> getCachedReceipts() async {
    return _cache.values.map((v) {
      final json = jsonDecode(v);
      return MobileFeeReceipt.fromJson(json);
    }).toList();
  }

  static Future<MobileFeeReceipt?> getReceipt(String receiptNumber) async {
    final raw = _cache[receiptNumber];
    if (raw == null) return null;
    return MobileFeeReceipt.fromJson(jsonDecode(raw));
  }
}
