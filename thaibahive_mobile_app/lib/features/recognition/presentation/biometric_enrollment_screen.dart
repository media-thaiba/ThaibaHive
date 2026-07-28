import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';

class BiometricEnrollmentScreen extends ConsumerStatefulWidget {
  const BiometricEnrollmentScreen({super.key});

  @override
  ConsumerState<BiometricEnrollmentScreen> createState() => _BiometricEnrollmentScreenState();
}

class _BiometricEnrollmentScreenState extends ConsumerState<BiometricEnrollmentScreen> {
  final ImagePicker _picker = ImagePicker();
  XFile? _capturedImage;
  bool _isSubmitting = false;

  Future<void> _capturePhoto() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85, // Client-side image compression targeting ~500KB
      );
      if (photo != null) {
        setState(() {
          _capturedImage = photo;
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to capture photo: $e')),
      );
    }
  }

  Future<void> _submitEnrollment() async {
    if (_capturedImage == null) return;

    setState(() {
      _isSubmitting = true;
    });

    try {
      final bytes = await File(_capturedImage!.path).readAsBytes();
      final base64Image = 'data:image/jpeg;base64,${base64Encode(bytes)}';

      final client = ref.read(apiClientProvider);
      // Calls self-enrollment endpoint
      await client.post('/api/staff/me/enroll-face', data: {
        'photoDataUrl': base64Image,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Facial reference photo successfully enrolled!')),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Face enrollment failed: $e')),
        );
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Biometric Face Enrollment'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Capture Reference Photo',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Position your face inside the circle in good lighting. This reference photo is used for AI attendance verification.',
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Center(
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 260,
                    height: 260,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: theme.colorScheme.surfaceContainerHighest,
                      border: Border.all(color: theme.colorScheme.primary, width: 3),
                      image: _capturedImage != null
                          ? DecorationImage(
                              image: FileImage(File(_capturedImage!.path)),
                              fit: BoxFit.cover,
                            )
                          : null,
                    ),
                    child: _capturedImage == null
                        ? Icon(Icons.person_rounded, size: 120, color: theme.colorScheme.primary.withValues(alpha: 0.5))
                        : null,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Card(
              color: theme.colorScheme.surfaceContainerLow,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Icon(Icons.shield_outlined, color: theme.colorScheme.primary, size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'PDPA Notice: Enrolling consents to storing a compressed facial reference photo for attendance verification. Photos are permanently deleted upon staff account offboarding.',
                        style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _capturePhoto,
              icon: const Icon(Icons.camera_front_rounded),
              label: Text(_capturedImage == null ? 'Take Photo' : 'Retake Photo'),
            ),
            const SizedBox(height: 12),
            if (_capturedImage != null)
              FilledButton.icon(
                onPressed: _isSubmitting ? null : _submitEnrollment,
                icon: _isSubmitting
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.check_circle_rounded),
                label: const Text('I Consent & Enroll Face Reference'),
              ),
          ],
        ),
      ),
    );
  }
}
