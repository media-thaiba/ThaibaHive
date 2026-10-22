import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/core/services/passkey_service.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_repository.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';
import 'package:thaibahive_mobile/shared/widgets/app_card.dart';
import 'package:thaibahive_mobile/shared/widgets/loading_widget.dart';

class PasskeyEnrollmentScreen extends ConsumerStatefulWidget {
  const PasskeyEnrollmentScreen({super.key});

  @override
  ConsumerState<PasskeyEnrollmentScreen> createState() => _PasskeyEnrollmentScreenState();
}

class _PasskeyEnrollmentScreenState extends ConsumerState<PasskeyEnrollmentScreen> {
  bool _isLoading = false;
  String? _error;
  String? _success;
  bool _passkeyAvailable = false;
  bool _passkeyRegistered = false;

  @override
  void initState() {
    super.initState();
    _checkPasskeyStatus();
  }

  Future<void> _checkPasskeyStatus() async {
    final service = PasskeyService();
    final available = await service.isAvailable();
    final registered = await service.isRegistered();
    if (mounted) {
      setState(() {
        _passkeyAvailable = available;
        _passkeyRegistered = registered;
      });
    }
  }

  Future<void> _enrollPasskey() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
      _success = null;
    });

    try {
      final authState = ref.read(authProvider);
      final user = authState.user;
      if (user == null) {
        throw Exception('No authenticated user found');
      }

      final repository = ref.read(authRepositoryProvider);

      // Step 1: Request registration challenge from server
      final beginData = await repository.registerPasskeyBegin(
        username: user.email,
        displayName: user.fullName,
        userId: user.id,
      );

      final challenge = beginData['challenge'] as String?;
      final rpId = beginData['rp']?['id'] as String?;

      if (challenge == null || rpId == null) {
        throw Exception('Invalid registration challenge from server');
      }

      // Step 2: Create passkey on device via Android Credential Manager
      final service = PasskeyService();
      final attestation = await service.createKey(
        username: user.email,
        displayName: user.fullName,
        userId: user.id,
        challenge: challenge,
        rpId: rpId,
        rpName: 'ThaibaHive',
      );

      // Step 3: Send attestation to server to complete registration
      final completeData = await repository.registerPasskeyComplete(attestation);

      if (completeData['verified'] != true) {
        throw Exception(completeData['error'] ?? 'Passkey registration failed');
      }

      // Step 4: Mark as registered locally
      final credentialId = completeData['credentialId'] as String?;
      if (credentialId != null) {
        await service.markRegistered(
          credentialId: credentialId,
          username: user.email,
        );
      }

      if (mounted) {
        setState(() {
          _isLoading = false;
          _success = 'Passkey registered successfully. You can now sign in with your device passkey.';
          _passkeyRegistered = true;
        });
      }
    } on Exception catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Register Passkey'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: _passkeyRegistered
          ? _buildSuccessView()
          : _buildEnrollmentView(theme),
    );
  }

  Widget _buildSuccessView() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_circle, color: Colors.green, size: 40),
          ),
          const SizedBox(height: 24),
          const Text(
            'Passkey Registered',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Your device passkey is now set up. Use it for faster sign-ins.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[600], fontSize: 14),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => context.pop(),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  Widget _buildEnrollmentView(ThemeData theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!_passkeyAvailable) ...[
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.amber.withOpacity(0.1),
                border: Border.all(color: Colors.amber.withOpacity(0.3)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Passkey Not Available',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Your device does not support passkeys via Android Credential Manager. '
                          'Please use password or Google Sign-In instead.',
                          style: TextStyle(color: Colors.grey[600], fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF7C4DFF).withOpacity(0.1),
                border: Border.all(color: const Color(0xFF7C4DFF).withOpacity(0.3)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.login_rounded, color: Color(0xFF7C4DFF), size: 28),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Set Up Passkey Sign-In',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Register your device passkey to sign in with fingerprint, face, or screen lock.',
                              style: TextStyle(color: Colors.grey[600], fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            AppCard(
              child: Column(
                children: [
                  const ListTile(
                    leading: Icon(Icons.fingerprint, color: Color(0xFF7C4DFF)),
                    title: Text('Fingerprint'),
                    subtitle: Text('Authenticate with your enrolled fingerprint'),
                  ),
                  const Divider(height: 1),
                  const ListTile(
                    leading: Icon(Icons.face, color: Color(0xFF7C4DFF)),
                    title: Text('Face Unlock'),
                    subtitle: Text('Authenticate with your enrolled face'),
                  ),
                  const Divider(height: 1),
                  const ListTile(
                    leading: Icon(Icons.lock, color: Color(0xFF7C4DFF)),
                    title: Text('Screen Lock'),
                    subtitle: Text('Fallback: PIN, pattern, or password'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            if (_error != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  border: Border.all(color: Colors.red.withOpacity(0.3)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _error!,
                  style: TextStyle(color: Colors.red[700], fontSize: 12),
                ),
              ),
            if (_success != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  border: Border.all(color: Colors.green.withOpacity(0.3)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _success!,
                  style: TextStyle(color: Colors.green[700], fontSize: 12),
                ),
              ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _isLoading || !_passkeyAvailable ? null : _enrollPasskey,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF7C4DFF),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                elevation: 0,
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text(
                      'Register Passkey',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: _isLoading ? null : () => context.pop(),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.grey[600],
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
              child: const Text('Cancel'),
            ),
          ],
        ],
      ),
    );
  }
}
