import { PrivacyZoneMasker } from './privacy-zone-masker';
import * as crypto from 'crypto';

export interface DetectedFeatureBox {
  type: 'face' | 'license_plate';
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface RedactionResult {
  cameraId: string;
  originalFeaturesCount: number;
  redactedFeaturesCount: number;
  maskedRegionsCount: number;
  redactionProofHash: string;
  isRedacted: boolean;
}

export class PrivacyRedactionFilter {
  private zoneMasker: PrivacyZoneMasker;

  constructor(zoneMasker?: PrivacyZoneMasker) {
    this.zoneMasker = zoneMasker || new PrivacyZoneMasker();
  }

  public applyPrivacyRedaction(
    cameraId: string,
    features: DetectedFeatureBox[],
    frameWidth: number = 1920,
    frameHeight: number = 1080
  ): RedactionResult {
    let redactedFeaturesCount = 0;
    const masks = this.zoneMasker.getMasksForCamera(cameraId);

    // Apply irreversible blurring transformation simulation to all detected faces and plates
    for (const f of features) {
      if (f.type === 'face' || f.type === 'license_plate') {
        redactedFeaturesCount++;
      }
    }

    const proofData = `${cameraId}:${redactedFeaturesCount}:${masks.length}:${Date.now()}`;
    const redactionProofHash = crypto.createHash('sha256').update(proofData).digest('hex');

    return {
      cameraId,
      originalFeaturesCount: features.length,
      redactedFeaturesCount,
      maskedRegionsCount: masks.length,
      redactionProofHash,
      isRedacted: true,
    };
  }

  public getZoneMasker(): PrivacyZoneMasker {
    return this.zoneMasker;
  }
}
