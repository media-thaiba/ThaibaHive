import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'mock_sync_server.dart';

class _AllowAllHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => true;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('MOB-003: Nonce Exchange & Token Restoration Integration Tests', () {
    late MockSyncServer mockServer;

    setUp(() async {
      HttpOverrides.global = _AllowAllHttpOverrides();
      mockServer = MockSyncServer();
      await mockServer.start();
    });

    tearDown(() async {
      await mockServer.stop();
      HttpOverrides.global = null;
    });

    test('401 Unauthorized triggers Nonce Exchange and successful retry flow', () async {
      // 1. Initial sync attempt with expired token fails with 401
      mockServer.setForcedStatusCode(401);
      final initialRes = await http.post(
        Uri.parse('${mockServer.baseUrl}/mobile/v1/sync'),
        headers: {'Authorization': 'Bearer expired_token_xyz'},
        body: jsonEncode({
          'mutations': [
            {'id': 'mut_001', 'action': 'STAFF_CHECKIN'}
          ]
        }),
      );
      expect(initialRes.statusCode, equals(401));

      // 2. Client performs Nonce Exchange
      final nonceRes = await http.post(
        Uri.parse('${mockServer.baseUrl}/auth/mobile-handoff/nonce'),
        headers: {'Content-Type': 'application/json'},
      );
      expect(nonceRes.statusCode, equals(200));
      final nonceData = jsonDecode(nonceRes.body);
      expect(nonceData['success'], isTrue);
      final renewedToken = nonceData['token'];
      expect(renewedToken, isNotEmpty);

      // 3. Reset mock server to 200 OK
      mockServer.setForcedStatusCode(200);

      // 4. Retry sync with renewed token
      final retryRes = await http.post(
        Uri.parse('${mockServer.baseUrl}/mobile/v1/sync'),
        headers: {
          'Authorization': 'Bearer $renewedToken',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'mutations': [
            {'id': 'mut_001', 'action': 'STAFF_CHECKIN'}
          ]
        }),
      );

      expect(retryRes.statusCode, equals(200));
      final retryData = jsonDecode(retryRes.body);
      expect(retryData['success'], isTrue);
      expect(retryData['processedMutations'], contains('mut_001'));
    });
  });
}
