import 'package:flutter_riverpod/flutter_riverpod.dart';

class GateVisitorPass {
  final String id;
  final String visitorName;
  final String hostName;
  final String purpose;
  final String status;

  GateVisitorPass({
    required this.id,
    required this.visitorName,
    required this.hostName,
    required this.purpose,
    required this.status,
  });
}

final gatekeeperProvider = StateNotifierProvider<GatekeeperNotifier, List<GateVisitorPass>>((ref) {
  return GatekeeperNotifier();
});

class GatekeeperNotifier extends StateNotifier<List<GateVisitorPass>> {
  GatekeeperNotifier()
      : super([
          GateVisitorPass(
            id: 'v_01',
            visitorName: 'David Warner',
            hostName: 'Prof. Alan Turing',
            purpose: 'Guest Lecture',
            status: 'APPROVED',
          ),
        ]);

  void verifyPass(String qrPayload) {
    // Add verified pass log to list
  }
}
