# Mobile App Dependency Map

Flutter routing and model dependencies.

```
GoRouter (Shell Route)
├── AuthState (Riverpod Secure Storage)
├── WebViewHandoffScreen
└── DashboardScreen
    ├── AttendanceProvider
    ├── TaskListProvider
    └── BookingsProvider
```

## Internal Storage Links
- JWT Token → `AppConstants.storageTokenKey` (secure storage).
- Widget Cache → Room local DB.
