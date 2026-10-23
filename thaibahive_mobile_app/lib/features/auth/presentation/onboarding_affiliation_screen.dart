import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/router.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/core/services/logger_service.dart';
import 'package:thaibahive_mobile/shared/widgets/th_input.dart';
import 'package:thaibahive_mobile/shared/widgets/app_card.dart';
import 'package:thaibahive_mobile/shared/widgets/status_badge.dart';

class OnboardingAffiliationScreen extends ConsumerStatefulWidget {
  const OnboardingAffiliationScreen({super.key});

  @override
  ConsumerState<OnboardingAffiliationScreen> createState() => _OnboardingAffiliationScreenState();
}

class _OnboardingAffiliationScreenState extends ConsumerState<OnboardingAffiliationScreen> {
  List<Map<String, dynamic>> _institutions = [];
  List<Map<String, dynamic>> _departments = [];
  String? _selectedInstitutionId;
  String? _selectedDepartmentId;
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _error;

  final _designationController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchInstitutions();
  }

  @override
  void dispose() {
    _designationController.dispose();
    super.dispose();
  }

  Future<void> _fetchInstitutions() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final client = ref.read(apiClientProvider);
      final response = await client.get('/api/institutions');
      final data = response.data;
      final list = (data['institutions'] as List? ?? []).cast<Map<String, dynamic>>();

      setState(() {
        _institutions = list;
        _isLoading = false;
      });
    } catch (e) {
      logger.error('[OnboardingAffiliationScreen] Failed to fetch institutions: $e');
      setState(() {
        _error = 'Failed to load institutions. Please try again.';
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchDepartments(String institutionId) async {
    try {
      final client = ref.read(apiClientProvider);
      final response = await client.get(
        '/api/departments',
        queryParameters: {'institutionId': institutionId},
      );
      final data = response.data;
      final list = (data['departments'] as List? ?? []).cast<Map<String, dynamic>>();

      setState(() {
        _departments = list;
        _selectedDepartmentId = null;
      });
    } catch (e) {
      logger.error('[OnboardingAffiliationScreen] Failed to fetch departments: $e');
      setState(() {
        _departments = [];
      });
    }
  }

  Future<void> _submitAffiliation() async {
    if (_selectedInstitutionId == null) {
      setState(() => _error = 'Please select your institution');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final client = ref.read(apiClientProvider);
      await client.post(
        '/api/auth/onboarding/affiliate',
        data: {
          'institutionId': _selectedInstitutionId,
          if (_selectedDepartmentId != null) 'departmentId': _selectedDepartmentId,
          if (_designationController.text.trim().isNotEmpty)
            'designation': _designationController.text.trim(),
        },
      );

      // Mark onboarding complete locally
      final storage = const FlutterSecureStorage();
      await storage.write(key: 'is_first_login', value: 'false');

      if (mounted) {
        context.go('/today');
      }
    } catch (e) {
      logger.error('[OnboardingAffiliationScreen] Affiliation failed: $e');
      setState(() {
        _error = 'Failed to complete onboarding. Please try again.';
        _isSubmitting = false;
      });
    }
  }

  Widget _buildDropdown({
    required String label,
    required List<Map<String, dynamic>> items,
    required String? selectedId,
    required ValueChanged<String?> onChanged,
    bool isLoading = false,
    bool isFirst = true,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            fontFamily: 'PlusJakartaSans',
            color: Color(0xFF9e9e9e),
            fontSize: 11.0,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 6),
        AppCard(
          variant: AppCardVariant.flat,
          margin: EdgeInsets.zero,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String?>(
                    isExpanded: true,
                    value: selectedId,
                    hint: Text(
                      'Select $label',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 13.5,
                        fontFamily: 'PlusJakartaSans',
                      ),
                    ),
                    items: items.map((item) {
                      return DropdownMenuItem<String?>(
                        value: item['id'] as String?,
                        child: Text(
                          item['name'] as String,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13.5,
                            fontFamily: 'PlusJakartaSans',
                          ),
                        ),
                      );
                    }).toList(),
                    onChanged: isLoading ? null : onChanged,
                  ),
                ),
              ),
              if (isLoading)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
            ],
          ),
        ),
        if (!isFirst) const SizedBox(height: 16),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0E1012) : Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 24),
                  Text(
                    'COMPLETE YOUR PROFILE',
                    style: const TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tell us where you work so we can tailor your experience.',
                    style: TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      color: Colors.grey[400],
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Institution Dropdown
                  _buildDropdown(
                    label: 'Institution',
                    items: _institutions,
                    selectedId: _selectedInstitutionId,
                    onChanged: (id) {
                      setState(() {
                        _selectedInstitutionId = id;
                        _selectedDepartmentId = null;
                        _departments = [];
                      });
                      if (id != null) _fetchDepartments(id);
                    },
                    isFirst: true,
                  ),

                  // Department Dropdown (cascaded)
                  if (_selectedInstitutionId != null)
                    _buildDropdown(
                      label: 'Department',
                      items: _departments,
                      selectedId: _selectedDepartmentId,
                      onChanged: (id) => setState(() => _selectedDepartmentId = id),
                      isFirst: false,
                    ),

                  const SizedBox(height: 24),

                  // Designation (optional)
                  Text(
                    'DESIGNATION / TITLE',
                    style: const TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      color: Color(0xFF9e9e9e),
                      fontSize: 11.0,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  AppCard(
                    variant: AppCardVariant.flat,
                    margin: EdgeInsets.zero,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: TextFormField(
                      controller: _designationController,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13.5,
                        fontFamily: 'PlusJakartaSans',
                      ),
                      decoration: InputDecoration(
                        hintText: 'e.g. Teacher, Coordinator, Administrator',
                        hintStyle: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 13.5,
                          fontFamily: 'PlusJakartaSans',
                        ),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),

                  if (_error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Colors.red, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _error!,
                              style: TextStyle(
                                color: Colors.red.shade300,
                                fontSize: 12,
                                fontFamily: 'PlusJakartaSans',
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 24),

                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: FilledButton(
                      onPressed: _isSubmitting || _selectedInstitutionId == null ? null : _submitAffiliation,
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF2EA44F),
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: const Color(0xFF2EA44F).withValues(alpha: 0.5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        elevation: 0,
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation(Colors.white),
                              ),
                            )
                          : const Text(
                              'Complete Setup',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                                fontFamily: 'PlusJakartaSans',
                              ),
                            ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  StatusBadge(
                    label: 'Step 1 of 1',
                    variant: StatusBadgeVariant.info,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
