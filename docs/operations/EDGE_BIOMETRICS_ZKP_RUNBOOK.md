# Edge Biometrics & Zero-Knowledge Proof (ZKP) Attendance Runbook

## Overview
Edge kiosks perform on-device neural embedding matching (cosine similarity $\ge 0.78$) in under 50ms without transmitting raw biometric face/fingerprint vectors over the network.

## Privacy & ZKP Verification
- Attendance proofs are attested via zk-SNARK Groth16 circuits over BN254 elliptic curves.
- Each proof generates a deterministic `nullifierHash` per session epoch to eliminate punch replay attacks.
- In offline conditions, attendance records are queued into a local encrypted HMAC-signed outbox and synchronized automatically upon network restoration.
