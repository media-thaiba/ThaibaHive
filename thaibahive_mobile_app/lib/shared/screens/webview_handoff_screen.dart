import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/shared/widgets/error_widget.dart';
import 'package:webview_flutter/webview_flutter.dart';

final _webDioProvider = Provider<Dio>((ref) {
  return Dio(BaseOptions(
    baseUrl: AppConstants.webBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
  ));
});

class WebViewHandoffScreen extends ConsumerStatefulWidget {
  final String targetPath;
  final String title;

  const WebViewHandoffScreen({
    super.key,
    required this.targetPath,
    required this.title,
  });

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
      final nonceResponse = await mobileDio.post('/auth/mobile-handoff/nonce');
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

      final setCookie = handoffResponse.headers.value('set-cookie');
      final location = handoffResponse.headers.value('location');

      if (setCookie != null) {
        final cookieManager = WebViewCookieManager();
        final cookie = WebViewCookie(
          name: 'thaibahive_session',
          value: _extractCookieValue(setCookie),
          domain: Uri.parse(AppConstants.webBaseUrl).host,
          path: '/',
        );
        await cookieManager.setCookie(cookie);
      }

      final targetUrl = location != null
          ? '${AppConstants.webBaseUrl}$location'
          : '${AppConstants.webBaseUrl}$redirectParam';

      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageStarted: (_) {
              if (mounted) setState(() => _isLoading = true);
            },
            onPageFinished: (_) {
              if (mounted) setState(() => _isLoading = false);
            },
            onWebResourceError: (error) {
              if (mounted) {
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

  String _extractCookieValue(String setCookieHeader) {
    final parts = setCookieHeader.split(';');
    return parts.first.trim();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
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
