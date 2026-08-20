import { SecureAggregationProtocol } from '@/lib/operations/crypto/secure-aggregation';
import { MaskingVectorEngine } from '@/lib/operations/crypto/masking-vector-engine';
import { ZkGradientVerifier } from '@/lib/operations/crypto/zk-gradient-verifier';

describe('SecureAggregationProtocol & ZkGradientVerifier', () => {
  it('should execute 4-phase SecAgg with 3 nodes and cancel out all pairwise masks', () => {
    const secAgg = new SecureAggregationProtocol();
    const sessionId = 'sesh_123';
    const participants = ['node_1', 'node_2', 'node_3'];
    const roundNumber = 1;

    secAgg.initSession(sessionId, 'model_1', roundNumber, participants, 2);

    // True client private vectors
    const v1 = [1.0, 2.0, 3.0];
    const v2 = [2.0, 3.0, 4.0];
    const v3 = [3.0, 4.0, 5.0];

    // Clients mask vectors locally
    const masked1 = MaskingVectorEngine.maskVector(v1, 'node_1', participants, roundNumber);
    const masked2 = MaskingVectorEngine.maskVector(v2, 'node_2', participants, roundNumber);
    const masked3 = MaskingVectorEngine.maskVector(v3, 'node_3', participants, roundNumber);

    secAgg.submitMaskedVector(sessionId, {
      nodeId: 'node_1',
      roundNumber,
      maskedVector: masked1,
      encryptedShares: {},
      timestamp: new Date().toISOString(),
    });

    secAgg.submitMaskedVector(sessionId, {
      nodeId: 'node_2',
      roundNumber,
      maskedVector: masked2,
      encryptedShares: {},
      timestamp: new Date().toISOString(),
    });

    secAgg.submitMaskedVector(sessionId, {
      nodeId: 'node_3',
      roundNumber,
      maskedVector: masked3,
      encryptedShares: {},
      timestamp: new Date().toISOString(),
    });

    const aggregated = secAgg.finalizeAggregation(sessionId);

    // Expected true average: [(1+2+3)/3, (2+3+4)/3, (3+4+5)/3] = [2.0, 3.0, 4.0]
    expect(aggregated[0]).toBeCloseTo(2.0, 4);
    expect(aggregated[1]).toBeCloseTo(3.0, 4);
    expect(aggregated[2]).toBeCloseTo(4.0, 4);
  });

  it('should generate and verify valid zk-SNARK gradient proof', () => {
    const vector = [1.0, 2.0, 2.0]; // Norm = 3.0
    const proofPayload = ZkGradientVerifier.generateProof('node_1', 'model_1', 1, vector, 5.0);

    expect(proofPayload.proofId).toBeDefined();
    const isValid = ZkGradientVerifier.verifyProof(proofPayload);
    expect(isValid).toBe(true);
  });

  it('should reject proof generation if L2 norm exceeds bound', () => {
    const largeVector = [10.0, 10.0];
    expect(() => ZkGradientVerifier.generateProof('node_1', 'model_1', 1, largeVector, 5.0)).toThrow(/exceeds bound/);
  });
});
