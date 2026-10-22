import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:passkeys_android/passkeys_android.dart';
import 'package:passkeys_platform_interface/types/allow_credential.dart';
import 'package:passkeys_platform_interface/types/authenticator_selection.dart';
import 'package:passkeys_platform_interface/types/pubkeycred_param.dart';
import 'package:passkeys_platform_interface/types/types.dart';

class PasskeyService {
  PasskeyService._internal();
  static final PasskeyService _instance = PasskeyService._internal();
  factory PasskeyService() => _instance;

  final _passkeys = PasskeysAndroid();

  static const String _storagePasskeyRegisteredKey = 'passkey_registered';
  static const String _storagePasskeyCredentialIdKey = 'passkey_credential_id';
  static const String _storagePasskeyUsernameKey = 'passkey_username';

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  /// Whether the device supports Android Credential Manager passkeys
  Future<bool> isAvailable() async {
    if (!kIsWeb && Platform.isAndroid) {
      try {
        return await _passkeys.canAuthenticate();
      } catch (e) {
        if (kDebugMode) print('[PasskeyService] availability check error: $e');
        return false;
      }
    }
    return false;
  }

  /// Whether a passkey is already registered for this user on this device
  Future<bool> isRegistered() async {
    final value = await _storage.read(key: _storagePasskeyRegisteredKey);
    return value == 'true';
  }

  /// Start passkey registration: request device to create a new WebAuthn credential.
  /// Returns WebAuthn-compatible registration payload to send to /api/auth/webauthn/register/complete
  Future<Map<String, dynamic>> createKey({
    required String username,
    required String displayName,
    required String userId,
    required String challenge,
    required String rpId,
    required String rpName,
  }) async {
    if (!kIsWeb && Platform.isAndroid) {
      try {
        final result = await _passkeys.register(
          challenge,
          RelyingPartyType(name: rpName, id: rpId),
          UserType(displayName: displayName, name: username, id: userId),
          AuthenticatorSelectionType(
            authenticatorAttachment: 'platform',
            requireResidentKey: true,
            residentKey: 'required',
            userVerification: 'required',
          ),
          [
            PubKeyCredParamType(type: 'public-key', alg: -7), // ES256
            PubKeyCredParamType(type: 'public-key', alg: -257), // RS256
          ],
          60000,
          'none',
        );

        return {
          'id': result.id,
          'rawId': result.rawId,
          'response': {
            'clientDataJSON': result.clientDataJSON,
            'attestationObject': result.attestationObject,
          },
          'type': 'public-key',
        };
      } catch (e) {
        if (kDebugMode) print('[PasskeyService] createKey error: $e');
        rethrow;
      }
    }
    throw UnsupportedError('Passkeys are only supported on Android devices.');
  }

  /// Start passkey authentication: request device to sign a WebAuthn assertion.
  /// Returns WebAuthn-compatible assertion payload to send to /api/auth/webauthn/login/complete
  Future<Map<String, dynamic>> getKey({
    required String challenge,
    required String rpId,
    List<String> allowCredentials = const [],
  }) async {
    if (!kIsWeb && Platform.isAndroid) {
      try {
        final allowCreds = allowCredentials.map((id) => AllowCredentialType(
          id: id,
          type: 'public-key',
          transports: const ['internal', 'hybrid'],
        )).toList();

        final result = await _passkeys.authenticate(
          rpId,
          challenge,
          60000,
          'required',
          allowCreds.isEmpty ? null : allowCreds,
        );

        return {
          'id': result.id,
          'rawId': result.rawId,
          'response': {
            'clientDataJSON': result.clientDataJSON,
            'authenticatorData': result.authenticatorData,
            'signature': result.signature,
            'userHandle': result.userHandle,
          },
          'type': 'public-key',
        };
      } catch (e) {
        if (kDebugMode) print('[PasskeyService] getKey error: $e');
        rethrow;
      }
    }
    throw UnsupportedError('Passkeys are only supported on Android devices.');
  }

  /// Mark a passkey as registered locally after successful server-side registration
  Future<void> markRegistered({
    required String credentialId,
    required String username,
  }) async {
    await _storage.write(key: _storagePasskeyRegisteredKey, value: 'true');
    await _storage.write(key: _storagePasskeyCredentialIdKey, value: credentialId);
    await _storage.write(key: _storagePasskeyUsernameKey, value: username);
  }

  /// Clear local passkey registration state (e.g. on logout)
  Future<void> clearRegistration() async {
    await _storage.delete(key: _storagePasskeyRegisteredKey);
    await _storage.delete(key: _storagePasskeyCredentialIdKey);
    await _storage.delete(key: _storagePasskeyUsernameKey);
  }

  /// Get the stored credential ID for the registered passkey
  Future<String?> getStoredCredentialId() async {
    return await _storage.read(key: _storagePasskeyCredentialIdKey);
  }
}
