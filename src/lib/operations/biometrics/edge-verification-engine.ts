import { AttendanceRecord } from './biometric-types';
import { NeuralBiometricMatcher } from './neural-biometric-matcher';

export interface VerifyAttendanceRequest {
  campusId: string;
  locationName: string;
  sessionId: string;
  queryEmbedding: number[];
  institutionId: string;
}

/**
 * Edge Verification Engine
 * Coordinates on-device biometric neural matching and attendance record formulation.
 */
export class EdgeVerificationEngine {
  private matcher: NeuralBiometricMatcher;

  constructor(matcher?: NeuralBiometricMatcher) {
    this.matcher = matcher || new NeuralBiometricMatcher();
  }

  public getMatcher(): NeuralBiometricMatcher {
    return this.matcher;
  }

  /**
   * Verifies attendance locally on the edge device
   */
  public verifyAttendance(req: VerifyAttendanceRequest): {
    success: boolean;
    record?: AttendanceRecord;
    message: string;
    similarityScore: number;
    latencyMs: number;
  } {
    const match = this.matcher.matchEmbedding(req.queryEmbedding);

    if (!match.matched || !match.userId) {
      return {
        success: false,
        message: 'Biometric verification failed: No matching authorized profile found.',
        similarityScore: match.similarityScore,
        latencyMs: match.matchingDurationMs,
      };
    }

    const record: AttendanceRecord = {
      id: `att_${match.userId}_${Date.now()}`,
      userId: match.userId,
      sessionId: req.sessionId,
      campusId: req.campusId,
      locationName: req.locationName,
      timestamp: new Date().toISOString(),
      verificationMethod: 'EDGE_NEURAL_ZKP',
      syncStatus: 'LOCAL_BUFFERED',
      institutionId: req.institutionId,
    };

    return {
      success: true,
      record,
      message: `Verified successfully for user ${match.userId}`,
      similarityScore: match.similarityScore,
      latencyMs: match.matchingDurationMs,
    };
  }
}
