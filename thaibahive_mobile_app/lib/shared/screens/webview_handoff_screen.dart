import 'dart:io';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/shared/widgets/error_widget.dart';
import 'package:webview_flutter/webview_flutter.dart';

final _webDioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: AppConstants.webBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
  ));

  if (kDebugMode) {
    dio.httpClientAdapter = IOHttpClientAdapter(
      createHttpClient: () {
        return HttpClient();
      },
    );
  }

  return dio;
});

class WebViewHandoffScreen extends ConsumerStatefulWidget {
  final String targetPath;
  final String title;

  const WebViewHandoffScreen({
    super.key,
    required this.targetPath,
    required this.title,
  });

  /// Extracts the cookie value from a Set-Cookie header (e.g., 'thaibahive_session=abc; Path=/; HttpOnly' -> 'abc')
  static String extractCookieValue(String setCookieHeader) {
    final firstPart = setCookieHeader.split(';').first.trim();
    final equalsIndex = firstPart.indexOf('=');
    if (equalsIndex != -1) {
      return firstPart.substring(equalsIndex + 1).trim();
    }
    return firstPart;
  }

  @override
  ConsumerState<WebViewHandoffScreen> createState() =>
      _WebViewHandoffScreenState();
}

class _WebViewHandoffScreenState extends ConsumerState<WebViewHandoffScreen> {
  WebViewController? _controller;
  bool _isLoading = true;
  bool _hasError = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initHandoff();
  }

  Future<void> _initHandoff() async {
    try {
      final mobileDio = ref.read(dioProvider);
      Response nonceResponse;
      int attempts = 0;
      while (true) {
        try {
          attempts++;
          nonceResponse = await mobileDio.post('/auth/mobile-handoff/nonce');
          break;
        } catch (e) {
          if (attempts >= 2) rethrow;
          await Future.delayed(const Duration(milliseconds: 500));
        }
      }
      final nonce = nonceResponse.data['nonce'] as String;

      final webDio = ref.read(_webDioProvider);
      final redirectParam = Uri.encodeComponent(widget.targetPath);

      final handoffResponse = await webDio.post(
        '/api/auth/mobile-handoff?redirect=$redirectParam',
        options: Options(
          headers: {'Authorization': 'Bearer $nonce'},
          followRedirects: false,
          validateStatus: (status) => status != null && status < 500,
        ),
      );

      if (handoffResponse.statusCode == 401) {
        if (mounted) {
          setState(() {
            _hasError = true;
            _errorMessage = 'Session expired. Please log in again.';
            _isLoading = false;
          });
        }
        return;
      }

      final setCookie = handoffResponse.headers.value('set-cookie');
      final location = handoffResponse.headers.value('location');

      if (setCookie != null) {
        final cookieManager = WebViewCookieManager();
        final cookie = WebViewCookie(
          name: 'thaibahive_session',
          value: WebViewHandoffScreen.extractCookieValue(setCookie),
          domain: Uri.parse(AppConstants.webBaseUrl).host,
          path: '/',
        );
        await cookieManager.setCookie(cookie);
      }

      String targetUrl;
      if (location != null && location.isNotEmpty) {
        final uri = Uri.parse(location);
        if (uri.hasScheme) {
          final baseUri = Uri.parse(AppConstants.webBaseUrl);
          targetUrl = uri.replace(
            scheme: baseUri.scheme,
            host: baseUri.host,
            port: baseUri.hasPort ? baseUri.port : null,
          ).toString();
        } else {
          final locPath = location.startsWith('/') ? location : '/$location';
          targetUrl = '${AppConstants.webBaseUrl}$locPath';
        }
      } else {
        final target = widget.targetPath.startsWith('/') ? widget.targetPath : '/${widget.targetPath}';
        targetUrl = '${AppConstants.webBaseUrl}$target';
      }

      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setNavigationDelegate(
          NavigationDelegate(
            onNavigationRequest: (NavigationRequest request) {
              final uri = Uri.tryParse(request.url);
              final baseUri = Uri.parse(AppConstants.webBaseUrl);
              if (uri != null && (uri.host == baseUri.host || uri.scheme == 'about')) {
                return NavigationDecision.navigate;
              }
              return NavigationDecision.prevent;
            },
            onPageStarted: (_) {
              if (mounted) setState(() => _isLoading = true);
            },
            onPageFinished: (_) {
              if (mounted) setState(() => _isLoading = false);
            },
            onWebResourceError: (error) {
              if (mounted && (error.isForMainFrame ?? true)) {
                setState(() {
                  _hasError = true;
                  _errorMessage = error.description;
                  _isLoading = false;
                });
              }
            },
          ),
        );

      await controller.loadRequest(Uri.parse(targetUrl));

      if (mounted) {
        setState(() {
          _controller = controller;
        });
      }
    } on DioException catch (e) {
      if (mounted) {
        setState(() {
          _hasError = true;
          _errorMessage = e.message ?? 'Failed to establish secure session.';
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _hasError = true;
          _errorMessage = 'An unexpected error occurred.';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final controller = _controller;
        if (controller != null && await controller.canGoBack()) {
          await controller.goBack();
        } else if (context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          leading: const CloseButton(),
          title: Text(widget.title),
          actions: [
            if (_controller != null)
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () => _controller!.reload(),
              ),
          ],
        ),
        body: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_hasError) {
      return AppErrorWidget(
        title: 'Connection Error',
        message: _errorMessage ?? 'Unable to load the page.',
        onRetry: () {
          setState(() {
            _hasError = false;
            _errorMessage = null;
            _isLoading = true;
          });
          _initHandoff();
        },
        icon: Icons.wifi_off_rounded,
      );
    }

    if (_controller == null) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Opening secure session...'),
          ],
        ),
      );
    }

    return Stack(
      children: [
        WebViewWidget(controller: _controller!),
        if (_isLoading)
          const Center(
            child: CircularProgressIndicator(),
          ),
      ],
    );
  }
}