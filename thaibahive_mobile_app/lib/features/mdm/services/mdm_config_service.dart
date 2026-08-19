import 'package:flutter/services.dart';
import '../models/mdm_config.dart';

class MdmConfigService {
  static const MethodChannel _channel = MethodChannel('org.thaibahive.mobile/mdm');

  static MdmConfig? _currentConfig;

  static MdmConfig? get currentConfig => _currentConfig;

  /// Loads managed configuration set by Enterprise MDM (Intune / Apple MDM)
  static Future<MdmConfig> loadManagedConfig() async {
    try {
      final Map<dynamic, dynamic>? result = await _channel.invokeMethod('getManagedConfig');
      if (result != null) {
        _currentConfig = MdmConfig.fromMap(Map<String, dynamic>.from(result));
        return _currentConfig!;
      }
    } catch (_) {
      // Fallback if platform channel or native MDM key is unavailable
    }

    _currentConfig = const MdmConfig();
    return _currentConfig!;
  }
}
