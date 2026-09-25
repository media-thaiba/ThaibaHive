import { PrivacyRedactionFilter } from '../../../operations/vision/privacy/privacy-redaction-filter';
import { PrivacyZoneMasker } from '../../../operations/vision/privacy/privacy-zone-masker';

describe('PrivacyRedactionFilter Face/Plate Blur & Exclusion Masking', () => {
  let filter: PrivacyRedactionFilter;
  let masker: PrivacyZoneMasker;

  beforeEach(() => {
    masker = new PrivacyZoneMasker();
    filter = new PrivacyRedactionFilter(masker);
  });

  it('should redact 100% of detected human faces and license plates', () => {
    const result = filter.applyPrivacyRedaction('cam_dorm_01', [
      { type: 'face', bbox: { x: 100, y: 120, width: 30, height: 30 }, confidence: 0.94 },
      { type: 'face', bbox: { x: 250, y: 140, width: 32, height: 32 }, confidence: 0.91 },
      { type: 'license_plate', bbox: { x: 500, y: 800, width: 80, height: 30 }, confidence: 0.98 },
    ]);

    expect(result.originalFeaturesCount).toBe(3);
    expect(result.redactedFeaturesCount).toBe(3);
    expect(result.isRedacted).toBe(true);
    expect(result.redactionProofHash.length).toBe(64); // SHA-256
  });

  it('should register and evaluate privacy exclusion mask zones', () => {
    masker.registerMask({
      zoneId: 'mask_dorm_window',
      cameraId: 'cam_dorm_01',
      polygon: [
        { x: 300, y: 100 },
        { x: 500, y: 100 },
        { x: 500, y: 300 },
        { x: 300, y: 300 },
      ],
      description: 'Dormitory Second Floor Windows',
    });

    expect(masker.isPointInMaskedZone('cam_dorm_01', { x: 400, y: 200 })).toBe(true);
    expect(masker.isPointInMaskedZone('cam_dorm_01', { x: 100, y: 50 })).toBe(false);
  });
});
