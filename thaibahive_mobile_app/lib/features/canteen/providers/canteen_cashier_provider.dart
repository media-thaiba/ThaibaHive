import 'package:flutter_riverpod/flutter_riverpod.dart';

class CanteenCartItem {
  final String id;
  final String name;
  final double price;
  final int qty;

  CanteenCartItem({
    required this.id,
    required this.name,
    required this.price,
    required this.qty,
  });
}

final canteenCashierProvider = StateNotifierProvider<CanteenCashierNotifier, List<CanteenCartItem>>((ref) {
  return CanteenCashierNotifier();
});

class CanteenCashierNotifier extends StateNotifier<List<CanteenCartItem>> {
  CanteenCashierNotifier()
      : super([
          CanteenCartItem(id: 'c_1', name: 'Meal Pass Redemption', price: 40.0, qty: 1),
        ]);

  double get totalAmount => state.fold(0.0, (sum, i) => sum + i.price * i.qty);

  void resetCart() {
    state = [
      CanteenCartItem(id: 'c_1', name: 'Meal Pass Redemption', price: 40.0, qty: 1),
    ];
  }
}
