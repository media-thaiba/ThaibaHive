import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class ThaibaHiveTheme {
  ThaibaHiveTheme._();

  // ── Brand colours (aligned with Design.md) ──────────────────────────────
  static const Color _primary = Color(0xFF1a8a3e);
  static const Color _primaryDark = Color(0xFF2ea44f); // lighter for dark mode
  static const Color _secondaryGreen = Color(0xFF8bc34a);
  static const Color _slateForeground = Color(0xFF4a4e52);

  // Light surface colours
  static const Color _backgroundLight = Color(0xFFf5f7f5);
  static const Color _cardLight = Color(0xFFFFFFFF);

  // Dark surface colours (Design.md dark tokens)
  static const Color _backgroundDark = Color(0xFF1A1D21);
  static const Color _cardDark = Color(0xFF22262b);
  static const Color _surfaceDark = Color(0xFF22262b);

  // ── Shared font ──────────────────────────────────────────────────────────
  static const String _fontFamily = 'PlusJakartaSans';

  static TextTheme _buildTextTheme(Color textColor) {
    return TextTheme(
      displayLarge: TextStyle(fontFamily: _fontFamily, fontSize: 57, fontWeight: FontWeight.w400, color: textColor),
      displayMedium: TextStyle(fontFamily: _fontFamily, fontSize: 45, fontWeight: FontWeight.w400, color: textColor),
      displaySmall: TextStyle(fontFamily: _fontFamily, fontSize: 36, fontWeight: FontWeight.w400, color: textColor),
      headlineLarge: TextStyle(fontFamily: _fontFamily, fontSize: 32, fontWeight: FontWeight.w700, color: textColor, letterSpacing: -0.5),
      headlineMedium: TextStyle(fontFamily: _fontFamily, fontSize: 28, fontWeight: FontWeight.w700, color: textColor, letterSpacing: -0.3),
      headlineSmall: TextStyle(fontFamily: _fontFamily, fontSize: 24, fontWeight: FontWeight.w600, color: textColor),
      titleLarge: TextStyle(fontFamily: _fontFamily, fontSize: 22, fontWeight: FontWeight.w600, color: textColor),
      titleMedium: TextStyle(fontFamily: _fontFamily, fontSize: 16, fontWeight: FontWeight.w600, color: textColor, letterSpacing: 0.1),
      titleSmall: TextStyle(fontFamily: _fontFamily, fontSize: 14, fontWeight: FontWeight.w600, color: textColor, letterSpacing: 0.1),
      bodyLarge: TextStyle(fontFamily: _fontFamily, fontSize: 16, fontWeight: FontWeight.w400, color: textColor),
      bodyMedium: TextStyle(fontFamily: _fontFamily, fontSize: 14, fontWeight: FontWeight.w400, color: textColor),
      bodySmall: TextStyle(fontFamily: _fontFamily, fontSize: 12, fontWeight: FontWeight.w400, color: textColor),
      labelLarge: TextStyle(fontFamily: _fontFamily, fontSize: 14, fontWeight: FontWeight.w600, color: textColor, letterSpacing: 0.1),
      labelMedium: TextStyle(fontFamily: _fontFamily, fontSize: 12, fontWeight: FontWeight.w500, color: textColor),
      labelSmall: TextStyle(fontFamily: _fontFamily, fontSize: 11, fontWeight: FontWeight.w500, color: textColor, letterSpacing: 0.5),
    );
  }

  // ── Light Theme ──────────────────────────────────────────────────────────
  static ThemeData get light {
    final colorScheme = ColorScheme.light(
      primary: _primary,
      secondary: _secondaryGreen,
      surface: _cardLight,
      error: const Color(0xFFdc3545),
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: _slateForeground,
      surfaceContainerHighest: _backgroundLight,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      fontFamily: _fontFamily,
      textTheme: _buildTextTheme(_slateForeground),
      scaffoldBackgroundColor: _backgroundLight,

      // ── AppBar ────────────────────────────────────────────────────────
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        backgroundColor: _cardLight,
        foregroundColor: _slateForeground,
        surfaceTintColor: Colors.transparent,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        titleTextStyle: TextStyle(
          fontFamily: _fontFamily,
          color: _slateForeground,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.2,
        ),
        shadowColor: Colors.black.withValues(alpha: 0.06),
      ),

      // ── Cards — elevation 0 + explicit shadow ─────────────────────────
      cardTheme: CardThemeData(
        elevation: 0,
        shadowColor: Colors.black.withValues(alpha: 0.08),
        color: _cardLight,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(
            color: const Color(0xFFd4dbd4).withValues(alpha: 0.6),
            width: 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      ),

      // ── Bottom Navigation Bar ─────────────────────────────────────────
      navigationBarTheme: NavigationBarThemeData(
        height: 62,
        backgroundColor: _cardLight,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.black.withValues(alpha: 0.08),
        elevation: 8,
        indicatorColor: _primary.withValues(alpha: 0.13),
        indicatorShape: const StadiumBorder(),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(size: 22, color: _primary);
          }
          return IconThemeData(
            size: 22,
            color: _slateForeground.withValues(alpha: 0.55),
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(
              fontFamily: _fontFamily,
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: _primary,
            );
          }
          return TextStyle(
            fontFamily: _fontFamily,
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: _slateForeground.withValues(alpha: 0.55),
          );
        }),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      ),

      // ── Buttons ───────────────────────────────────────────────────────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(
            fontFamily: _fontFamily,
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: _primary,
          side: const BorderSide(color: _primary, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(
            fontFamily: _fontFamily,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: _primary,
          textStyle: const TextStyle(
            fontFamily: _fontFamily,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: _primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(
            fontFamily: _fontFamily,
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // ── Input Fields ──────────────────────────────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _cardLight,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: const Color(0xFFd4dbd4).withValues(alpha: 0.8)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: const Color(0xFFd4dbd4).withValues(alpha: 0.8)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFdc3545)),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFdc3545), width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        labelStyle: TextStyle(fontFamily: _fontFamily, color: _slateForeground.withValues(alpha: 0.7)),
        hintStyle: TextStyle(fontFamily: _fontFamily, color: _slateForeground.withValues(alpha: 0.45)),
      ),

      // ── FAB ───────────────────────────────────────────────────────────
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: _primary,
        foregroundColor: Colors.white,
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),

      // ── Chips ─────────────────────────────────────────────────────────
      chipTheme: ChipThemeData(
        backgroundColor: _backgroundLight,
        selectedColor: _primary.withValues(alpha: 0.12),
        labelStyle: const TextStyle(fontFamily: _fontFamily, fontSize: 13, fontWeight: FontWeight.w500),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        side: BorderSide(color: const Color(0xFFd4dbd4).withValues(alpha: 0.6)),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
      ),

      // ── Dividers, Dialogs, SnackBars ──────────────────────────────────
      dividerTheme: DividerThemeData(
        color: const Color(0xFFd4dbd4).withValues(alpha: 0.5),
        thickness: 1,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: _cardLight,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        titleTextStyle: const TextStyle(
          fontFamily: _fontFamily,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: _slateForeground,
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF1a1d21),
        contentTextStyle: const TextStyle(fontFamily: _fontFamily, fontSize: 14, color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      listTileTheme: ListTileThemeData(
        titleTextStyle: const TextStyle(fontFamily: _fontFamily, fontSize: 15, fontWeight: FontWeight.w500, color: _slateForeground),
        subtitleTextStyle: TextStyle(fontFamily: _fontFamily, fontSize: 13, color: _slateForeground.withValues(alpha: 0.6)),
      ),
    );
  }

  // ── Dark Theme ───────────────────────────────────────────────────────────
  static ThemeData get dark {
    const Color darkText = Color(0xFFd1d5d1);

    final colorScheme = ColorScheme.dark(
      primary: _primaryDark,
      secondary: _secondaryGreen,
      surface: _surfaceDark,
      error: const Color(0xFFc62828),
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: darkText,
      surfaceContainerHighest: _backgroundDark,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      fontFamily: _fontFamily,
      textTheme: _buildTextTheme(darkText),
      scaffoldBackgroundColor: _backgroundDark,

      // ── AppBar ────────────────────────────────────────────────────────
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        backgroundColor: _surfaceDark,
        foregroundColor: darkText,
        surfaceTintColor: Colors.transparent,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        titleTextStyle: const TextStyle(
          fontFamily: _fontFamily,
          color: darkText,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.2,
        ),
        shadowColor: Colors.black.withValues(alpha: 0.3),
      ),

      // ── Cards — dark-specific shadow (black shadows are visible in dark) ──
      cardTheme: CardThemeData(
        elevation: 0,
        shadowColor: Colors.black.withValues(alpha: 0.4),
        color: _cardDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(
            color: Colors.white.withValues(alpha: 0.06),
            width: 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      ),

      // ── Bottom Navigation Bar (dark) ──────────────────────────────────
      navigationBarTheme: NavigationBarThemeData(
        height: 62,
        backgroundColor: _surfaceDark,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.black.withValues(alpha: 0.5),
        elevation: 8,
        indicatorColor: _primaryDark.withValues(alpha: 0.18),
        indicatorShape: const StadiumBorder(),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(size: 22, color: _primaryDark);
          }
          return IconThemeData(size: 22, color: darkText.withValues(alpha: 0.5));
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(
              fontFamily: _fontFamily,
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: _primaryDark,
            );
          }
          return TextStyle(
            fontFamily: _fontFamily,
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: darkText.withValues(alpha: 0.5),
          );
        }),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      ),

      // ── Buttons (dark) ────────────────────────────────────────────────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _primaryDark,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontFamily: _fontFamily, fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: _primaryDark,
          side: BorderSide(color: _primaryDark, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontFamily: _fontFamily, fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: _primaryDark,
          textStyle: const TextStyle(fontFamily: _fontFamily, fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: _primaryDark,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontFamily: _fontFamily, fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),

      // ── Input Fields (dark) ───────────────────────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _cardDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _primaryDark, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        labelStyle: TextStyle(fontFamily: _fontFamily, color: darkText.withValues(alpha: 0.7)),
        hintStyle: TextStyle(fontFamily: _fontFamily, color: darkText.withValues(alpha: 0.4)),
      ),

      // ── FAB ───────────────────────────────────────────────────────────
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: _primaryDark,
        foregroundColor: Colors.white,
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),

      // ── Chips (dark) ──────────────────────────────────────────────────
      chipTheme: ChipThemeData(
        backgroundColor: _cardDark,
        selectedColor: _primaryDark.withValues(alpha: 0.2),
        labelStyle: const TextStyle(fontFamily: _fontFamily, fontSize: 13, fontWeight: FontWeight.w500, color: darkText),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        side: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
      ),

      // ── Dividers, Dialogs, SnackBars (dark) ──────────────────────────
      dividerTheme: DividerThemeData(
        color: Colors.white.withValues(alpha: 0.08),
        thickness: 1,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: _cardDark,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        titleTextStyle: const TextStyle(
          fontFamily: _fontFamily,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: darkText,
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF2a2e33),
        contentTextStyle: const TextStyle(fontFamily: _fontFamily, fontSize: 14, color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      listTileTheme: const ListTileThemeData(
        titleTextStyle: TextStyle(fontFamily: _fontFamily, fontSize: 15, fontWeight: FontWeight.w500, color: darkText),
        subtitleTextStyle: TextStyle(fontFamily: _fontFamily, fontSize: 13, color: Color(0xFF9e9e9e)),
      ),
    );
  }
}
