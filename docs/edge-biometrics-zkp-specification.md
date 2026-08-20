# Edge Biometrics & Privacy-Preserving Zero-Knowledge Attendance Specification

## 1. Edge Neural Embedding Matcher
- **Vector Dimension**: 128-dimensional continuous facial/biometric embedding.
- **Matching Function**: Cosine similarity against on-device enrolled cache:
$$\text{Sim}(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2} \ge 0.78$$
- **Latency Benchmark**: Sub-50ms inference on edge kiosk hardware.

## 2. zk-SNARK Groth16 / BN254 Attendance Verification
To guarantee privacy compliance (GDPR, FERPA), raw biometric embeddings and student identifiers are **never transmitted** over the network.

### Circuit Relations (R1CS Constraints: 4,096)
1. **Membership Proof**: Proves possession of valid embedding committed to active session Merkle root $\mathcal{R}_{\text{session}}$.
2. **Epoch Nullifier**:
$$\text{Nullifier} = \mathcal{H}_{\text{poseidon}}(\text{UserSecret}, \text{SessionId}, \text{Epoch})$$
3. **Replay Protection**: The verifier stores spent nullifiers per epoch; duplicate submissions are rejected immediately.

## 3. Offline Tamper-Resistant Outbox
- Local SQLite outbox buffers attendance logs during network partitions.
- Each record is chained via HMAC-SHA256 and synchronized deterministically upon connection restoration.
