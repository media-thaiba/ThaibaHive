import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/shared/screens/webview_handoff_screen.dart';

void main() {
  group('WebViewHandoffScreen Cookie Parser Tests', () {
    test('extractCookieValue properly extracts token from complex Set-Cookie headers', () {
      expect(
        WebViewHandoffScreen.extractCookieValue('thaibahive_session=token_abc123; Path=/; HttpOnly; SameSite=Lax'),
        equals('token_abc123'),
      );

      expect(
        WebViewHandoffScreen.extractCookieValue('thaibahive_session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Secure; HttpOnly'),
        equals('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
      );

      expect(
        WebViewHandoffScreen.extractCookieValue('custom_cookie=value_with=extra_equals; Path=/'),
        equals('value_with=extra_equals'),
      );

      expect(
        WebViewHandoffScreen.extractCookieValue('raw_token_value'),
        equals('raw_token_value'),
      );
    });
  });
}
