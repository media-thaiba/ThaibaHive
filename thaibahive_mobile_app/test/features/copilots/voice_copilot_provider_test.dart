import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/features/copilots/models/voice_copilot_state.dart';
import 'package:thaibahive_mobile/features/copilots/providers/voice_copilot_provider.dart';

void main() {
  group('VoiceCopilotProvider Tests', () {
    late ProviderContainer container;

    setUp(() {
      container = ProviderContainer();
    });

    tearDown(() {
      container.dispose();
    });

    test('Initial state is VoiceCopilotStatus.idle', () {
      final state = container.read(voiceCopilotProvider);
      expect(state.status, equals(VoiceCopilotStatus.idle));
      expect(state.data, isNull);
      expect(state.errorMessage, isNull);
    });

    test('reset() resets state back to VoiceCopilotStatus.idle', () {
      final notifier = container.read(voiceCopilotProvider.notifier);
      notifier.reset();

      final state = container.read(voiceCopilotProvider);
      expect(state.status, equals(VoiceCopilotStatus.idle));
    });

    test('VoiceQueryResponseData deserializes json correctly', () {
      final json = {
        'rawTranscript': 'Show attendance for Campus A',
        'intent': 'QUERY_ATTENDANCE',
        'campusId': 'campus-a',
        'confidence': 0.95,
        'synthesizedAudioText': 'Campus A attendance is 94.2%.',
      };

      final data = VoiceQueryResponseData.fromJson(json);

      expect(data.rawTranscript, equals('Show attendance for Campus A'));
      expect(data.intent, equals('QUERY_ATTENDANCE'));
      expect(data.campusId, equals('campus-a'));
      expect(data.confidence, equals(0.95));
      expect(data.synthesizedAudioText, equals('Campus A attendance is 94.2%.'));
    });
  });
}
