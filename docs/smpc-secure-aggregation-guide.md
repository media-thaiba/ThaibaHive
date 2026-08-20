# SMPC & Secure Aggregation Protocol Guide

## 1. 4-Phase Cryptographic SecAgg
1. **Advertise Keys**: Nodes exchange ephemeral Diffie-Hellman public keys.
2. **Share Keys & Zero-Sum Masks**: Nodes generate pairwise PRNG seeds $s_{u,v}$ and split private keys via Shamir $(t,n)$-threshold secret sharing over $2^{127}-1$ prime field.
3. **Masked Vector Upload**: Nodes upload $y_u = x_u + \sum_{v > u} \text{PRNG}(s_{u,v}) - \sum_{v < u} \text{PRNG}(s_{u,v}) + \text{PRNG}(b_u)$.
4. **Unmasking & Reconstruction**: Alive and dropped nodes reveal necessary shares allowing exact zero-sum mask cancellation.

## 2. zk-SNARK Groth16 Verification
Zero-knowledge SNARK proofs over BN254 elliptic curve verify that local gradient vectors adhere to L2-norm clipping bounds $\|g\|_2 \le C$ without disclosing weights.
