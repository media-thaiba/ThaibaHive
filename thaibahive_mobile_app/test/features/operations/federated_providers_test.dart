import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/operations/application/federated_providers.dart';

void main() {
  group('FederatedModelItem Model Tests', () {
    test('should parse from JSON correctly', () {
      final json = {
        'modelId': 'm_retention_v1',
        'name': 'Student Retention Predictor',
        'domain': 'retention',
        'status': 'training',
        'currentRound': 4,
      };

      final model = FederatedModelItem.fromJson(json);

      expect(model.modelId, 'm_retention_v1');
      expect(model.name, 'Student Retention Predictor');
      expect(model.domain, 'retention');
      expect(model.status, 'training');
      expect(model.currentRound, 4);
    });

    test('should default empty values when JSON keys are missing', () {
      final model = FederatedModelItem.fromJson({});

      expect(model.modelId, '');
      expect(model.name, '');
      expect(model.domain, '');
      expect(model.status, 'initialized');
      expect(model.currentRound, 0);
    });
  });
}
