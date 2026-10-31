import 'package:flutter/material.dart';

/// Reusable input field primitive modeled after the MediaHive standard.
/// Features >=11px micro-labels, focus glow animations, and integrated password toggles.
class ThInput extends StatefulWidget {
  final String label;
  final String? hint;
  final TextEditingController? controller;
  final bool isPassword;
  final TextInputType keyboardType;
  final TextInputAction? textInputAction;
  final IconData? prefixIcon;
  final Widget? suffixIcon;
  final String? errorText;
  final String? Function(String?)? validator;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onFieldSubmitted;
  final Color accentColor;

  const ThInput({
    super.key,
    required this.label,
    this.hint,
    this.controller,
    this.isPassword = false,
    this.keyboardType = TextInputType.text,
    this.textInputAction,
    this.prefixIcon,
    this.suffixIcon,
    this.errorText,
    this.validator,
    this.onChanged,
    this.onFieldSubmitted,
    this.accentColor = const Color(0xFF1B4D3E),
  });

  @override
  State<ThInput> createState() => _ThInputState();
}

class _ThInputState extends State<ThInput> {
  bool _isFocused = false;
  late bool _obscureText;
  String? _validatorError;

  @override
  void initState() {
    super.initState();
    _obscureText = widget.isPassword;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final displayError = widget.errorText ?? _validatorError;
    final hasError = displayError != null && displayError.isNotEmpty;
    final defaultBorderColor = isDark ? const Color(0xFF2A3649) : const Color(0xFFE2E8F0);
    final activeBorderColor = hasError
        ? Colors.red.shade400
        : (_isFocused ? widget.accentColor : defaultBorderColor);
    final inputBg = isDark ? const Color(0xFF1A222F) : const Color(0xFFF8FAFC);
    final textColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final hintColor = isDark ? Colors.white38 : const Color(0xFF94A3B8);
    final labelColor = isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155);
    final iconColor = isDark ? Colors.white60 : const Color(0xFF64748B);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(left: 2, bottom: 6),
            child: Text(
              widget.label.toUpperCase(),
              style: TextStyle(
                fontFamily: 'PlusJakartaSans',
                color: hasError ? Colors.red.shade400 : labelColor,
                fontSize: 11.0,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.8,
              ),
            ),
          ),
        Focus(
          onFocusChange: (focused) => setState(() => _isFocused = focused),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            decoration: BoxDecoration(
              color: inputBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: activeBorderColor,
                width: _isFocused ? 1.6 : 1.0,
              ),
              boxShadow: _isFocused
                  ? [
                      BoxShadow(
                        color: widget.accentColor.withValues(alpha: 0.15),
                        blurRadius: 8,
                        spreadRadius: 1,
                      )
                    ]
                  : null,
            ),
            child: TextFormField(
              controller: widget.controller,
              obscureText: _obscureText,
              keyboardType: widget.keyboardType,
              textInputAction: widget.textInputAction,
              onChanged: (val) {
                if (_validatorError != null) {
                  setState(() => _validatorError = null);
                }
                widget.onChanged?.call(val);
              },
              onFieldSubmitted: widget.onFieldSubmitted,
              validator: (value) {
                final err = widget.validator?.call(value);
                if (_validatorError != err) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (mounted) setState(() => _validatorError = err);
                  });
                }
                return err;
              },
              style: TextStyle(
                fontFamily: 'PlusJakartaSans',
                color: textColor,
                fontSize: 13.5,
              ),
              decoration: InputDecoration(
                hintText: widget.hint,
                hintStyle: TextStyle(
                  fontFamily: 'PlusJakartaSans',
                  color: hintColor,
                  fontSize: 13.5,
                ),
                prefixIcon: widget.prefixIcon != null
                    ? Icon(widget.prefixIcon, color: iconColor, size: 19)
                    : null,
                suffixIcon: widget.isPassword
                    ? IconButton(
                        icon: Icon(
                          _obscureText ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          color: iconColor,
                          size: 19,
                        ),
                        tooltip: _obscureText ? 'Show password' : 'Hide password',
                        onPressed: () => setState(() => _obscureText = !_obscureText),
                      )
                    : widget.suffixIcon,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                border: InputBorder.none,
                errorStyle: const TextStyle(height: 0, fontSize: 0),
              ),
            ),
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.only(left: 4),
            child: Semantics(
              liveRegion: true,
              child: Text(
                displayError,
                style: TextStyle(
                  color: Colors.red.shade400,
                  fontSize: 11.0,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
