/// V1.0 Pilot Gate — client-side mirror of `src/lib/attendance/pilot-gate.ts`.
///
/// Frozen modules are hidden from navigation and deep-links to frozen paths
/// redirect to /today with a `module_frozen` error query parameter.
/// The gate is fail-closed: active in release builds unless
/// `--dart-define=V1_PILOT_MODE=false` (or disabled/off/0) is set.
library;

import 'package:flutter/foundation.dart';

// ---------------------------------------------------------------------------
// Gate activation
// ---------------------------------------------------------------------------

/// Returns true when the V1 pilot freeze is active.
///
/// Fail-closed: ON by default in release builds; OFF only when
/// `V1_PILOT_MODE` is explicitly set to false|disabled|off|0.
bool get isPilotActive {
  const raw = String.fromEnvironment('V1_PILOT_MODE');
  if (raw.isEmpty) {
    // Debug: unfrozen by default so dev workflow isn't blocked.
    // Release: frozen by default.
    return kReleaseMode;
  }
  final lower = raw.toLowerCase().trim();
  return lower != 'false' && lower != 'disabled' && lower != 'off' && lower != '0';
}

// ---------------------------------------------------------------------------
// Frozen path list (must stay in sync with pilot-gate.ts isFrozenPilotPath)
// ---------------------------------------------------------------------------

/// Route path prefixes that are frozen during the V1.0 pilot.
/// Mirrors the `_FROZEN_MODULES` array in `src/lib/attendance/pilot-gate.ts`.
const List<String> kFrozenRoutePrefixes = [
  '/finance',
  '/fleet',
  '/vehicles', // fleet mobile alias
  '/agent-hub',
  '/conferencing',
  '/canteen',
  '/accounts',
  '/purchases',
  '/operations/finance',
  '/operations/fleet',
  '/operations/accounts',
  '/operations/procurement',
];

/// Returns true when [path] belongs to a frozen module.
bool isFrozenPath(String path) {
  if (!isPilotActive) return false;
  for (final prefix in kFrozenRoutePrefixes) {
    if (path == prefix || path.startsWith('$prefix/')) return true;
  }
  return false;
}
