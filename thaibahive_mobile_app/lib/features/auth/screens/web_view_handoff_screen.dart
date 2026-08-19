import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:webview_flutter/webview_flutter.dart';
import '../../../core/config/app_config.dart';
import '../services/token_storage_service.dart';

class WebViewHandoffScreen extends StatefulWidget {
  final String targetUrl;
  final String? title;

  const WebViewHandoffScreen({
    super.key,
    required this.targetUrl,
    this.title,
  });

  @override
  State<WebViewHandoffScreen> createState() => _WebViewHandoffScreenState();
}

class _WebViewHandoffScreenState extends State<WebViewHandoffScreen> {
  WebViewController? _controller;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _performHandoff();
  }

  Future<void> _performHandoff() async {
    try {
      final tokenStorage = TokenStorageService();
      final jwtToken = await tokenStorage.getToken();

      if (jwtToken == null || jwtToken.isEmpty) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Authentication required. Please log in again.';
        });
        return;
      }

      // Request short-lived nonce for WebView SSO handoff
      final nonceResponse = await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/auth/mobile-handoff/nonce'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $jwtToken',
        },
        body: jsonEncode({
          'targetUrl': widget.targetUrl,
          'deviceId': 'flutter_companion_app',
        }),
      );

      if (nonceResponse.statusCode == 201 || nonceResponse.statusCode == 200) {
        final data = jsonDecode(nonceResponse.body);
        final redirectUrl = data['redirectUrl'] as String? ?? '/';

        final fullUrl = '${AppConfig.webBaseUrl}$redirectUrl';

        final controller = WebViewController()
          ..setJavaScriptMode(JavaScriptMode.unrestricted)
          ..setNavigationDelegate(
            NavigationDelegate(
              onPageFinished: (String url) {
                if (mounted) {
                  setState(() {
                    _isLoading = false;
                  });
                }
              },
              onWebResourceError: (WebResourceError error) {
                if (mounted) {
                  setState(() {
                    _isLoading = false;
                    _errorMessage = 'Failed to load page: ${error.description}';
                  });
                }
              },
            ),
          )
          ..loadRequest(Uri.parse(fullUrl));

        if (mounted) {
          setState(() {
            _controller = controller;
          });
        }
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Failed to authenticate WebView session.';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Error initializing web view: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title ?? 'ThaibaHive Web'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() {
                _isLoading = true;
                _errorMessage = null;
              });
              _performHandoff();
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          if (_errorMessage != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: Colors.red),
                    const SizedBox(height: 16),
                    Text(
                      _errorMessage!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 16),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _performHandoff,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )
          else if (_controller != null)
            WebViewWidget(controller: _controller!),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(),
            ),
        ],
      ),
    );
  }
}
