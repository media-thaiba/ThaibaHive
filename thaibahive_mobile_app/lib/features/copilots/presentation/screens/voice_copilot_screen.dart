import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:go_router/go_router.dart';
import '../../providers/voice_copilot_provider.dart';
import '../../models/voice_copilot_state.dart';

/// VoiceCopilotScreen — Push-to-talk executive voice intelligence interface.
/// Wired to live authenticated API calls via voiceCopilotProvider.
class VoiceCopilotScreen extends ConsumerStatefulWidget {
  const VoiceCopilotScreen({super.key});

  @override
  ConsumerState<VoiceCopilotScreen> createState() => _VoiceCopilotScreenState();
}

class _VoiceCopilotScreenState extends ConsumerState<VoiceCopilotScreen>
    with SingleTickerProviderStateMixin {
  final stt.SpeechToText _speechToText = stt.SpeechToText();
  bool _isListening = false;
  bool _isSpeechAvailable = false;
  String _transcript = '';
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);
    _pulseAnimation =
        Tween<double>(begin: 0.9, end: 1.1).animate(_pulseController);
    _initSpeech();
  }

  Future<void> _initSpeech() async {
    _isSpeechAvailable = await _speechToText.initialize();
    setState(() {});
  }

  Future<void> _startListening() async {
    if (!_isSpeechAvailable) return;

    ref.read(voiceCopilotProvider.notifier).reset();

    setState(() {
      _isListening = true;
      _transcript = '';
    });

    await _speechToText.listen(
      onResult: (result) {
        setState(() {
          _transcript = result.recognizedWords;
        });
        if (result.finalResult && _transcript.isNotEmpty) {
          _stopListening();
          _processVoiceQuery(_transcript);
        }
      },
      listenFor: const Duration(seconds: 15),
      pauseFor: const Duration(seconds: 3),
      localeId: 'en_US',
    );
  }

  Future<void> _stopListening() async {
    await _speechToText.stop();
    setState(() {
      _isListening = false;
    });
  }

  void _processVoiceQuery(String text) {
    ref.read(voiceCopilotProvider.notifier).sendVoiceQuery(text);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _speechToText.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final voiceState = ref.watch(voiceCopilotProvider);

    final isLoading = voiceState.status == VoiceCopilotStatus.authenticating ||
        voiceState.status == VoiceCopilotStatus.querying;
    final errorMessage = voiceState.errorMessage;
    final copilotResponse = voiceState.data?.synthesizedAudioText;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Executive Voice Intelligence'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            if (errorMessage != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.errorContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        errorMessage,
                        style: TextStyle(color: theme.colorScheme.onErrorContainer),
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        if (_transcript.isNotEmpty) {
                          _processVoiceQuery(_transcript);
                        }
                      },
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 32),

            // Pulse mic button
            Semantics(
              label: _isListening ? 'Stop listening' : 'Start voice copilot recording',
              hint: 'Hold button to speak executive query',
              button: true,
              child: AnimatedBuilder(
                animation: _pulseAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _isListening ? _pulseAnimation.value : 1.0,
                    child: GestureDetector(
                      onTapDown: (_) => _startListening(),
                      onTapUp: (_) => _stopListening(),
                      child: Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          color: _isListening
                              ? theme.colorScheme.error
                              : theme.colorScheme.primary,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: (_isListening
                                      ? theme.colorScheme.error
                                      : theme.colorScheme.primary)
                                  .withOpacity(0.35),
                              blurRadius: 24,
                              spreadRadius: 8,
                            ),
                          ],
                        ),
                        child: Icon(
                          _isListening ? Icons.mic : Icons.mic_none,
                          color: Colors.white,
                          size: 40,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),


            const SizedBox(height: 16),
            Text(
              _isListening ? 'Listening...' : 'Hold to Speak',
              style: theme.textTheme.labelLarge,
            ),
            const SizedBox(height: 32),

            if (_transcript.isNotEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Transcript',
                          style: theme.textTheme.labelMedium?.copyWith(
                              color: theme.colorScheme.primary)),
                      const SizedBox(height: 8),
                      Text(_transcript),
                    ],
                  ),
                ),
              ),

            if (isLoading)
              const Padding(
                padding: EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 8),
                    Text('Connecting to Copilot Swarm...'),
                  ],
                ),
              ),

            if (copilotResponse != null && !isLoading)
              Card(
                color: theme.colorScheme.secondaryContainer,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Copilot Swarm Response',
                          style: theme.textTheme.labelMedium?.copyWith(
                              color: theme.colorScheme.secondary)),
                      const SizedBox(height: 8),
                      Text(
                        copilotResponse,
                        style: theme.textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
