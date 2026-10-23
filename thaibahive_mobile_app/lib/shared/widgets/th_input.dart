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

  @override
  void initState() {
    super.initState();
    _obscureText = widget.isPassword;
  }

  @override
  Widget build(BuildContext context) {
    final hasError = widget.errorText != null && widget.errorText!.isNotEmpty;
    final activeBorderColor = hasError
        ? Colors.red.shade400
        : (_isFocused ? widget.accentColor : const BorderSide(color: Color(0xFF1E2022)).color);

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
                color: hasError ? Colors.red.shade300 : Colors.grey[500],
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
              color: const Color(0xFF121316).withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: activeBorderColor,
                width: _isFocused ? 1.5 : 1.0,
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
              onChanged: widget.onChanged,
              onFieldSubmitted: widget.onFieldSubmitted,
              validator: widget.validator,
              style: const TextStyle(
                fontFamily: 'PlusJakartaSans',
                color: Colors.white,
                fontSize: 13.5,
              ),
              decoration: InputDecoration(
                hintText: widget.hint,
                hintStyle: TextStyle(
                  fontFamily: 'PlusJakartaSans',
                  color: Colors.grey[600],
                  fontSize: 13.5,
                ),
                prefixIcon: widget.prefixIcon != null
                    ? Icon(widget.prefixIcon, color: Colors.grey[500], size: 18)
                    : null,
                suffixIcon: widget.isPassword
                    ? IconButton(
                        icon: Icon(
                          _obscureText ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          color: Colors.grey[500],
                          size: 18,
                        ),
                        onPressed: () => setState(() => _obscureText = !_obscureText),
                      )
                    : widget.suffixIcon,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
            child: Text(
              widget.errorText!,
              style: TextStyle(
                color: Colors.red.shade300,
                fontSize: 11.0,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ],
    );
  }
}
