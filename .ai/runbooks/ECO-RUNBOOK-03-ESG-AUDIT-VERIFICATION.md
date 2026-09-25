# ECO-RUNBOOK-03: ESG Compliance Verification & Merkle Cryptographic Proof Audit

**Module**: ECO-MESH / NetZeroOS  
**Target Standards**: GHG Protocol Corporate Standard, GRI 305, CSRD ESRS E1, ISO 14064-3  

---

## 1. Overview
This guide instructs internal auditors and third-party assurance providers (e.g. KPMG, EY, DNV) on how to verify campus carbon disclosures using the SHA-256 Merkle Proof Anchor.

---

## 2. Cryptographic Verification Procedure

```bash
# 1. Verify unbroken hash chain integrity across all historical carbon ledgers
pnpm test src/lib/__tests__/operations/eco/carbon-merkle-anchor.test.ts

# 2. Run automated ESG compliance verification
pnpm eco:simulate
```

---

## 3. Audit Leaf Verification Formula
For any activity record $R_i$, the individual audit leaf is:
$$\text{Leaf}_i = \text{SHA256}(\text{Scope} \parallel \text{Category} \parallel \text{Quantity} \parallel \text{EmissionFactor} \parallel \text{TotalKg} \parallel \text{Timestamp})$$

The batch Merkle root is:
$$\text{MerkleRoot} = \text{SHA256}(\text{Leaf}_1 \parallel \text{Leaf}_2 \parallel \dots \parallel \text{Leaf}_N)$$

---

## 4. Anti-Greenwashing Safeguards
- **Double-Counting Prevention**: Offset certificates cannot be applied across multiple reporting periods once `status = 'retired'`.
- **Location vs Market Dual Reporting**: Scope 2 grid electricity must report both location-based grid emission intensity ($425\text{ g/kWh}$) and contractual market-based PPA factors ($0\text{ g/kWh}$).
- **Additionality Verification**: Unbundled RECs must have verified vintage within 12 months of consumption year.
