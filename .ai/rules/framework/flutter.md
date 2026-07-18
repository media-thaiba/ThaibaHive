# Flutter Framework Conventions

Rules and architectural patterns for the ThaibaHive companion mobile application.

---

## 1. State Management (Riverpod)
- Use **Riverpod** (`flutter_riverpod` and generated code via `riverpod_generator`) for all state requirements.
- Prefer `ConsumerWidget` or `ConsumerStatefulWidget` over raw widgets where state access is required.
- Keep State models immutable. Use `@freezed` or standard custom patterns for model mutation.
- **Never** use the standard `provider` package.

## 2. Navigation & Routing (GoRouter)
- Handle all screens and deep linking using **GoRouter** (`lib/app/router.dart`).
- Protect path routes by integrating authentication guards inside routing handlers.

## 3. WebView Integration (Auth Handoff)
- Store active JWT session tokens securely using `FlutterSecureStorage` under `AppConstants.storageTokenKey`.
- When loading a dashboard route within an embedded WebView, use the `/auth/mobile-handoff/nonce` single-use Nonce exchange flow to securely set cookies. Never pass raw credentials in the URL parameters.

## 4. UI Elements
- Always provide pull-to-refresh capabilities on dashboard lists.
- Optimize network image rendering by using `cached_network_image` rather than default Image providers.
