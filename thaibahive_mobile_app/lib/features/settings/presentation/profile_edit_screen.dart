import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../app/theme.dart';
import '../../../core/services/file_upload_service.dart';
import '../../../features/auth/data/auth_state.dart';
import '../../../features/dashboard/presentation/components/role_badge.dart';
import '../data/settings_provider.dart';
import '../data/settings_repository.dart';

class ProfileEditScreen extends ConsumerStatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  ConsumerState<ProfileEditScreen> createState() =>
      _ProfileEditScreenState();
}

class _ProfileEditScreenState extends ConsumerState<ProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _firstNameCtrl;
  late TextEditingController _lastNameCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _designationCtrl;
  bool _isSubmitting = false;
  bool _isUploadingAvatar = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(currentUserProvider);
    _firstNameCtrl = TextEditingController(text: user?.firstName ?? '');
    _lastNameCtrl = TextEditingController(text: user?.lastName ?? '');
    _emailCtrl = TextEditingController(text: user?.email ?? '');
    _phoneCtrl = TextEditingController(text: user?.phone ?? '');
    _designationCtrl = TextEditingController(text: user?.designation ?? '');
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _designationCtrl.dispose();
    super.dispose();
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }

  Future<void> _pickAndUploadAvatar() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 512,
      maxHeight: 512,
      imageQuality: 80,
    );
    if (picked == null) return;

    setState(() => _isUploadingAvatar = true);
    try {
      final uploadService = ref.read(fileUploadServiceProvider);
      final result = await uploadService.uploadFile(
        File(picked.path),
        path: '/upload/avatar',
      );

      final currentUser = ref.read(currentUserProvider);
      if (currentUser == null) return;

      final updatedUser = currentUser.copyWith(avatarUrl: result.url);

      // Sync both providers
      await ref.read(currentUserProvider.notifier).updateUser(updatedUser);
      ref.read(authProvider.notifier).updateUser(updatedUser);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile picture updated')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploadingAvatar = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);
    try {
      final repo = ref.read(settingsRepositoryProvider);
      final updated = await repo.updateProfile({
        'first_name': _firstNameCtrl.text.trim(),
        'last_name': _lastNameCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'designation': _designationCtrl.text.trim(),
      });
      await ref.read(currentUserProvider.notifier).updateUser(updated);
      ref.read(authProvider.notifier).updateUser(updated);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('Edit Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Profile Header ──
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF22262b) : Colors.white,
                  borderRadius: BorderRadius.circular(AppRadius.card),
                  border: Border.all(
                    color: AppColors.border(context).withValues(alpha: isDark ? 0.3 : 0.5),
                  ),
                  boxShadow: AppColors.surfaceShadow2(context),
                ),
                child: Column(
                  children: [
                    // Avatar with camera overlay
                    GestureDetector(
                      onTap: _isUploadingAvatar ? null : _pickAndUploadAvatar,
                      child: Stack(
                        children: [
                          Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: AppColors.primary(context).withValues(alpha: 0.3),
                                width: 2.5,
                              ),
                            ),
                            child: ClipOval(
                              child: user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty
                                  ? CachedNetworkImage(
                                      imageUrl: user.avatarUrl!,
                                      fit: BoxFit.cover,
                                      placeholder: (_, __) => Container(
                                        color: AppColors.muted(context),
                                        child: Icon(
                                          Icons.person_rounded,
                                          size: 36,
                                          color: AppColors.mutedForeground(context),
                                        ),
                                      ),
                                      errorWidget: (_, __, ___) => Container(
                                        color: AppColors.muted(context),
                                        child: Center(
                                          child: Text(
                                            user.initials,
                                            style: TextStyle(
                                              fontFamily: 'PlusJakartaSans',
                                              fontSize: 24,
                                              fontWeight: FontWeight.w800,
                                              color: AppColors.primary(context),
                                            ),
                                          ),
                                        ),
                                      ),
                                    )
                                  : Container(
                                      color: AppColors.muted(context),
                                      child: Center(
                                        child: Text(
                                          user?.initials ?? '?',
                                          style: TextStyle(
                                            fontFamily: 'PlusJakartaSans',
                                            fontSize: 24,
                                            fontWeight: FontWeight.w800,
                                            color: AppColors.primary(context),
                                          ),
                                        ),
                                      ),
                                    ),
                            ),
                          ),
                          // Camera overlay
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                color: AppColors.primary(context),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isDark ? const Color(0xFF22262b) : Colors.white,
                                  width: 2,
                                ),
                              ),
                              child: _isUploadingAvatar
                                  ? const SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Icon(
                                      Icons.camera_alt_rounded,
                                      size: 14,
                                      color: Colors.white,
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Greeting
                    Text(
                      _greeting(),
                      style: AppTypography.overline(
                        context,
                        color: AppColors.primary(context),
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Full name
                    Text(
                      user?.fullName ?? 'User',
                      style: AppTypography.title(context),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    // Role badge
                    if (user?.role != null)
                      RoleBadge(role: user!.role),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // ── Form Fields ──
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _firstNameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'First Name',
                        prefixIcon: Icon(Icons.person_rounded),
                      ),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty) ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _lastNameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Last Name',
                      ),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty) ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _emailCtrl,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneCtrl,
                decoration: const InputDecoration(
                  labelText: 'Phone',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _designationCtrl,
                decoration: const InputDecoration(
                  labelText: 'Designation',
                  prefixIcon: Icon(Icons.badge_rounded),
                ),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: (_isSubmitting || _isUploadingAvatar) ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Save Changes'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
